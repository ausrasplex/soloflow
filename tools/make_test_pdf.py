"""Test helper: draws a business account statement PDF in the Example Bank layout (positions match the demo
layout in prisma/seed.ts and tools/testdata/layouts.json) from a JSON description. Totals are worked out here.
Run: python3 tools/make_test_pdf.py tools/testdata/business-account.json out.pdf"""
import json, sys
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
d = json.load(open(sys.argv[1])); out = sys.argv[2]
W, H = A4
c = canvas.Canvas(out, pagesize=A4)
P = lambda x, y: (x / 100 * W, H - y / 100 * H)
def t(x, y, s, size=9, bold=False):
    c.setFont('Helvetica-Bold' if bold else 'Helvetica', size); X, Y = P(x, y); c.drawString(X, Y - size, s)
def tr(x, y, s, size=9):
    c.setFont('Helvetica', size); X, Y = P(x, y); c.drawRightString(X, Y - size, s)
m = lambda n: '{:,.2f}'.format(n)
bal = d['opening']; debits = credits = 0
for r in d['rows']:
    debits += r.get('debit', 0); credits += r.get('credit', 0)
    bal = round(bal - r.get('debit', 0) + r.get('credit', 0), 2); r['balance'] = bal
t(4, 4, d['bank'].upper(), 16, True); t(4, 9, 'BUSINESS ACCOUNT STATEMENT', 12, True)
t(58, 13.5, 'Account ' + d['acct'], 9, True)
t(58, 19.5, 'Statement period', 8); t(58, 22, d['start'] + ' to ' + d['end'], 9, True)
t(4, 30, 'Account summary', 9, True)
for (x, label, val) in [(4, 'Opening Balance', d['opening']), (24, 'Total Debits', debits), (62, 'Total Credits', credits), (80, 'Closing Balance', bal)]:
    t(x + 0.5, 37, label, 7); t(x + 0.5, 40, m(val), 10, True)
t(4, 93, 'Page 1', 7)
c.showPage()
t(4, 5, 'Transactions', 11, True)
y = 12.5
for h, x in [('Date', 4.5), ('Description', 16.5)]: t(x, y, h, 8, True)
for h, x in [('Debit', 69.5), ('Credit', 82.5), ('Balance', 95.5)]: tr(x, y, h, 8)
y += 2.6
page = 2
for r in d['rows']:
    if y > 90:
        t(4, 94, 'Continued on next page', 7); c.showPage(); page += 1; y = 6
    t(4.5, y, r['date'], 8); t(16.5, y, r['desc'][:48], 8)
    if r.get('debit'): tr(69.5, y, m(r['debit']), 8)
    if r.get('credit'): tr(82.5, y, m(r['credit']), 8)
    tr(95.5, y, m(r['balance']), 8)
    y += 2.6
c.save()
print('pages', page, 'closing', bal)
