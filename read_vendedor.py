import docx
doc = docx.Document('templates/template-contrato-vendedor.docx')
for p in doc.paragraphs:
    if "{" in p.text or "_" in p.text:
        print(p.text)
