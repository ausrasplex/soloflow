#!/usr/bin/env python3
"""Turn an approved mockup board (docs/mockup/<Name>.dc.html) into a React screen beside its page.

The markup is converted to JSX; the board's logic class becomes a React class component. The shared frame
(side navigation, top bar, alerts and footer) is drawn once by src/app/(app)/layout.tsx, so it is stripped from
the converted screen when the board includes it. A page.tsx is written next to the screen if there is none yet.

Run:  python3 tools/convert.py Name [Name ...]
Add new screens to SCREENS (board name -> route folder under src/app/(app)) and ROUTES (board name -> URL).
Screens reused from Folio were converted once and are now maintained by hand; do not re-run them.
"""
import html, json, os, re, sys
from html.parser import HTMLParser

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'docs', 'mockup')
APP = os.path.join(ROOT, 'src', 'app', '(app)')
# board name -> route folder under src/app/(app). Only new screens belong here.
SCREENS = {}
ROUTES = {'Dashboard': '/dashboard', 'Accounts': '/accounts', 'AddAccount': '/accounts/new', 'Statements': '/statements', 'Settings': '/settings',
          'Profile': '/profile', 'Banks': '/settings', 'Layouts': '/settings'}
NOTIF = '{(v.notifsOpen) ? (<><div onClick={v.toggleNotifs} style={css("position:fixed;inset:0;z-index:19")}></div></>) : null}'
VOID = {'input', 'img', 'br', 'hr', 'meta', 'link', 'path', 'circle', 'line', 'rect', 'polyline', 'polygon', 'ellipse', 'stop', 'use'}
ATTR_MAP = {'class': 'className', 'for': 'htmlFor', 'tabindex': 'tabIndex', 'readonly': 'readOnly', 'maxlength': 'maxLength',
            'autocomplete': 'autoComplete', 'inputmode': 'inputMode', 'autofocus': 'autoFocus', 'spellcheck': 'spellCheck',
            'colspan': 'colSpan', 'rowspan': 'rowSpan', 'enterkeyhint': 'enterKeyHint', 'srcset': 'srcSet', 'viewbox': 'viewBox',
            'xlink:href': 'xlinkHref', 'crossorigin': 'crossOrigin'}
HOLE = re.compile(r'\{\{\s*([^}]+?)\s*\}\}')


def route(href):
    m = re.match(r'^([A-Za-z]+)\.dc\.html(#.*)?$', href)
    if not m:
        return href
    return ROUTES.get(m.group(1), '/') + (m.group(2) or '')


class Node:
    def __init__(self, tag, attrs):
        self.tag, self.attrs, self.kids = tag, attrs, []


class P(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.root = Node('#root', [])
        self.stack = [self.root]

    def handle_starttag(self, tag, attrs):
        n = Node(tag, attrs)
        self.stack[-1].kids.append(n)
        if tag not in VOID:
            self.stack.append(n)

    def handle_startendtag(self, tag, attrs):
        self.stack[-1].kids.append(Node(tag, attrs))

    def handle_endtag(self, tag):
        if tag in VOID:
            return
        for i in range(len(self.stack) - 1, 0, -1):
            if self.stack[i].tag == tag:
                del self.stack[i:]
                return

    def handle_data(self, d):
        self.stack[-1].kids.append(d)

    def handle_entityref(self, name):
        self.stack[-1].kids.append(html.unescape('&%s;' % name))

    def handle_charref(self, name):
        self.stack[-1].kids.append(html.unescape('&#%s;' % name))


class Conv:
    def __init__(self):
        self.imports = set()

    def expr(self, path, scope):
        path = path.strip()
        if path in ('true', 'false', 'null'):
            return path
        if re.match(r'^-?\d+(\.\d+)?$', path):
            return path
        parts = path.split('.')
        head = parts[0]
        base = head if head in scope or head == '$index' else 'v.' + head
        if head == '$index':
            base = scope.get('$index', '$index')
        return base + ''.join('?.' + p for p in parts[1:])

    def value(self, raw, scope):
        """Attribute value -> JSX attribute expression (without braces)."""
        m = HOLE.fullmatch(raw.strip()) if raw is not None else None
        if m:
            return self.expr(m.group(1), scope), True
        if raw is not None and HOLE.search(raw):
            out = HOLE.sub(lambda mm: '${' + self.expr(mm.group(1), scope) + ' ?? ""}', raw.replace('`', '\\`'))
            return '`' + out + '`', True
        return raw, False

    def attrs(self, n, scope):
        tag = n.tag
        a = dict(n.attrs)
        out = []
        has_change = 'onChange' in [k for k, _ in n.attrs] or 'onchange' in a
        for k, val in n.attrs:
            if k.startswith('hint-') or k in ('data-dc-script', 'data-props'):
                continue
            kk = k
            if k.startswith('on'):
                kk = 'on' + k[2:3].upper() + k[3:] if k[2:3].islower() else k
                kk = {'onpointerdown': 'onPointerDown', 'onpointermove': 'onPointerMove', 'onpointerup': 'onPointerUp', 'onpointerleave': 'onPointerLeave',
                      'onmouseenter': 'onMouseEnter', 'onmouseleave': 'onMouseLeave', 'onclick': 'onClick', 'onchange': 'onChange', 'onblur': 'onBlur'}.get(k.lower(), kk)
            elif k in ATTR_MAP:
                kk = ATTR_MAP[k]
            elif '-' in k and not k.startswith('aria-') and not k.startswith('data-'):
                kk = re.sub(r'-([a-z])', lambda m: m.group(1).upper(), k)
            if val is None:
                out.append(kk)
                continue
            if kk == 'style':
                e, dyn = self.value(val, scope)
                out.append('style={css(%s)}' % (e if dyn else json.dumps(val)))
                continue
            if kk == 'href':
                e, dyn = self.value(val, scope)
                out.append('href={%s}' % ('R(' + e + ')' if dyn else json.dumps(route(val))))
                continue
            e, dyn = self.value(val, scope)
            if tag in ('input', 'textarea') and kk == 'value':
                if not has_change:
                    kk = 'defaultValue'
                e = '(%s) ?? ""' % e if dyn else json.dumps(val)
                out.append('%s={%s}' % (kk, e))
                continue
            if tag == 'input' and kk == 'checked':
                if not has_change:
                    kk = 'defaultChecked'
                out.append('%s={!!(%s)}' % (kk, e if dyn else json.dumps(val)))
                continue
            if dyn:
                out.append('%s={%s}' % (kk, e))
            else:
                out.append('%s=%s' % (kk, json.dumps(val)))
        return out

    def text(self, t, scope):
        if not t.strip():
            return ' ' if ('\n' not in t and t != '') else ''
        parts = []
        pos = 0
        for m in HOLE.finditer(t):
            if m.start() > pos:
                parts.append(self.lit(t[pos:m.start()]))
            parts.append('{' + self.expr(m.group(1), scope) + '}')
            pos = m.end()
        if pos < len(t):
            parts.append(self.lit(t[pos:]))
        return ''.join(parts)

    def lit(self, s):
        s = re.sub(r'\s*\n\s*', ' ', s)
        if re.search(r'[{}<>]', s):
            return '{' + json.dumps(s) + '}'
        return s

    def node(self, n, scope, depth=0):
        if isinstance(n, str):
            return self.text(n, scope)
        t = n.tag
        a = dict(n.attrs)
        if t in ('helmet', 'script', 'title', 'meta', 'link', 'head'):
            return ''
        if t == 'sc-if':
            e, _ = self.value(a.get('value', ''), scope)
            return '{(%s) ? (<>%s</>) : null}' % (e, self.kids(n, scope, depth))
        if t == 'sc-for':
            e, _ = self.value(a.get('list', ''), scope)
            var = a.get('as', 'it')
            idx = 'i%d' % depth
            s2 = dict(scope)
            s2[var] = var
            s2['$index'] = idx
            return '{(%s || []).map((%s, %s) => (<React.Fragment key={%s}>%s</React.Fragment>))}' % (e, var, idx, idx, self.kids(n, s2, depth + 1))
        if t == 'dc-import':
            name = a.get('name')
            self.imports.add(name)
            props = []
            for k, val in n.attrs:
                if k in ('name',) or k.startswith('hint-'):
                    continue
                kk = re.sub(r'-([a-z])', lambda m: m.group(1).upper(), k)
                e, dyn = self.value(val, scope)
                props.append('%s={%s}' % (kk, e) if dyn else '%s=%s' % (kk, json.dumps(val)))
            return '<%s %s />' % (name + 'Screen', ' '.join(props))
        if t in ('x-dc', 'body', 'html', '#root'):
            return self.kids(n, scope, depth)
        at = self.attrs(n, scope)
        head = '<' + t + (' ' + ' '.join(at) if at else '')
        if t in VOID and not n.kids:
            return head + ' />'
        return head + '>' + self.kids(n, scope, depth) + '</' + t + '>'

    def kids(self, n, scope, depth):
        return ''.join(self.node(k, scope, depth) for k in n.kids)


def strip_frame(jsx):
    """Removes the shell, side navigation, top bar and footer a board draws, keeping only the page content."""
    m = re.search(r'<div className=(?:"shell"|\{`shell \$\{v\.embCls \?\? ""\}`\})', jsx)
    if not m or '</header>' not in jsx[m.start():]:
        return jsx
    emb = 'embCls' in m.group(0)
    te = jsx.index('</header>', m.start()) + len('</header>')
    after = jsx[te:]
    if after.startswith(NOTIF):
        after = after[len(NOTIF):]
    fs = after.rfind('<footer')
    if fs < 0:
        return jsx
    fe = after.index('</footer>', fs) + len('</footer>')
    rest = after[fe:]
    if not rest.startswith('</div></div>'):
        raise SystemExit('the board frame does not close as expected; strip it by hand')
    return jsx[:m.start()] + ('<div className={v.embCls}>' if emb else '') + after[:fs] + ('</div>' if emb else '') + rest[len('</div></div>'):]


def convert(name):
    src = open(os.path.join(SRC, name + '.dc.html'), encoding='utf-8').read()
    xdc = src[src.index('<x-dc>'):src.index('</x-dc>') + len('</x-dc>')]
    css = '\n'.join(re.findall(r'<style>(.*?)</style>', xdc, re.S))
    markup = re.sub(r'<helmet>.*?</helmet>', '', xdc, flags=re.S)
    p = P()
    p.feed(markup)
    c = Conv()
    jsx = strip_frame(c.node(p.root, {}))
    script = re.search(r'<script type="text/x-dc"[^>]*>(.*?)</script>', src, re.S).group(1)
    script = script.replace('class Component extends DCLogic {', 'class Screen extends DCBase {', 1)
    script = re.sub(r"'([A-Za-z]+\.dc\.html(?:#[^']*)?)'", lambda m: json.dumps(route(m.group(1))).replace('"', "'"), script)
    script = re.sub(r"'([A-Za-z]+)\.dc\.html#' \+", lambda m: "'" + ROUTES.get(m.group(1), '/') + "#' +", script)
    end = script.rstrip().rfind('}')
    render = '\n  render() {\n    const v = Object.assign({}, this.renderVals(), this.common());\n    return (<>\n<style>{SCREEN_CSS}</style>\n' + jsx + '\n</>);\n  }\n'
    script = script[:end] + render + script[end:]
    imports = ''.join("import %sScreen from './%s';\n" % (i, i) for i in sorted(c.imports))
    out = ("'use client';\n// Generated from docs/mockup/%s.dc.html by tools/convert.py, then tools/patches/%s.py.\n"
           "/* eslint-disable */\n// @ts-nocheck\nimport React from 'react';\nimport { DCBase, css, R } from '@/lib/dc';\n%s\n"
           "const SCREEN_CSS = %s;\n\n%s\n\nexport default Screen;\n") % (name, name, imports, json.dumps(css), script.strip())
    patch = os.path.join(ROOT, 'tools', 'patches', name + '.py')
    if os.path.exists(patch):
        ns = {}
        exec(open(patch, encoding='utf-8').read(), ns)
        for i, (old, new) in enumerate(ns.get('EDITS', [])):
            if old not in out:
                raise SystemExit('%s patch %d did not match: %s' % (name, i, old[:120]))
            out = out.replace(old, new, 1 if not ns.get('ALL') else -1)
        if 'post' in ns:
            out = ns['post'](out)
    if name not in SCREENS:
        raise SystemExit('Add %s to SCREENS (its route folder) first.' % name)
    folder = os.path.join(APP, SCREENS[name])
    os.makedirs(folder, exist_ok=True)
    open(os.path.join(folder, name + '.jsx'), 'w', encoding='utf-8').write(out)
    page = os.path.join(folder, 'page.tsx')
    if not os.path.exists(page):
        open(page, 'w', encoding='utf-8').write("import %s from './%s';\n\nexport default function Page() {\n  return <%s />;\n}\n" % (name, name, name))
    return len(out)


if __name__ == '__main__':
    names = sys.argv[1:] or list(SCREENS)
    for n in names:
        print(n, convert(n))
