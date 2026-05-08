import re

path = 'index.html'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace <article class=\"tool-card ... onclick=\"window.location='...'\">
# and the corresponding closing </article>
# We'll do it by finding the patterns

pattern = re.compile(r'<article\s+class="tool-card\s+glass-card"\s+id="([^"]+)"\s+onclick="window\.location=\'([^\']+)\'">')
content = pattern.sub(r'<a href="\2" class="tool-card glass-card" id="\1">', content)

content = content.replace('</article>', '</a>')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Converted tool-cards to anchor tags.")
