import os

html_path = r'F:\Amber_solutions_Kira\Trinity\public\demo-boris.html'
route_path = r'F:\Amber_solutions_Kira\Trinity\src\app\demo\boris\route.ts'

with open(html_path, 'r', encoding='utf-8') as f:
    html = f.read()

# Escape for JS template literal
html = html.replace('\\', '\\\\')
html = html.replace('`', '\\`')
html = html.replace('${', '\\${')

route = f"""import {{ NextResponse }} from 'next/server'

const HTML = `{html}`

export async function GET() {{
  return new NextResponse(HTML, {{
    headers: {{ 'Content-Type': 'text/html; charset=utf-8' }},
  }})
}}
"""

with open(route_path, 'w', encoding='utf-8') as f:
    f.write(route)

print(f'Done! route.ts size: {len(route)} chars')
