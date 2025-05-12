#!/usr/bin/env python3
import os
import re
import json
import markdown
import shutil
from datetime import datetime
from pathlib import Path

# Configuration
POSTS_DIR = Path("blogs/posts")
OUTPUT_DIR = Path("blogs/html")
IMAGES_DIR = Path("blogs/images")
JSON_OUTPUT = Path("blogs/posts.json")

# Ensure directories exist
OUTPUT_DIR.mkdir(exist_ok=True, parents=True)

def parse_markdown_file(file_path):
    """Parse a markdown file and extract metadata and content."""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Extract metadata from frontmatter
    metadata = {}
    if content.startswith('---'):
        # Extract YAML frontmatter
        parts = content.split('---', 2)
        if len(parts) >= 3:
            frontmatter = parts[1].strip()
            content = parts[2].strip()
            
            # Parse simple key-value pairs
            for line in frontmatter.split('\n'):
                if ':' in line:
                    key, value = line.split(':', 1)
                    metadata[key.strip()] = value.strip()
    
    # Extract title from the first heading if not in metadata
    if 'title' not in metadata:
        title_match = re.search(r'^#\s+(.+)$', content, re.MULTILINE)
        if title_match:
            metadata['title'] = title_match.group(1)
        else:
            # Use filename as title
            metadata['title'] = file_path.stem.replace('-', ' ').title()
    
    # Extract date from filename or metadata
    if 'date' not in metadata:
        date_match = re.match(r'(\d{4}-\d{2}-\d{2})', file_path.stem)
        if date_match:
            metadata['date'] = date_match.group(1)
        else:
            # Use file modification time
            metadata['date'] = datetime.fromtimestamp(
                os.path.getmtime(file_path)
            ).strftime('%Y-%m-%d')
    
    # Extract preview (first paragraph)
    preview_match = re.search(r'\n\n(.+?)\n\n', content, re.DOTALL)
    if preview_match:
        preview = preview_match.group(1)
        # Remove markdown formatting
        preview = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', preview)  # Remove links
        preview = re.sub(r'[*_]{1,2}([^*_]+)[*_]{1,2}', r'\1', preview)  # Remove bold/italic
        preview = re.sub(r'`([^`]+)`', r'\1', preview)  # Remove inline code
        metadata['preview'] = preview[:150] + '...' if len(preview) > 150 else preview
    else:
        metadata['preview'] = "Read this post..."
    
    # Extract image if any
    image_match = re.search(r'!\[.*?\]\((.+?)\)', content)
    if image_match:
        metadata['image'] = image_match.group(1)
    
    # Convert content to HTML
    metadata['content'] = markdown.markdown(
        content,
        extensions=['extra', 'codehilite', 'nl2br']
    )
    
    return metadata

def generate_html(metadata, file_path):
    """Generate HTML file from markdown metadata and content."""
    output_filename = OUTPUT_DIR / f"{file_path.stem}.html"
    
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{metadata['title']} | Your Name</title>
    <link rel="stylesheet" href="../../styles.css">
    <style>
        .blog-post {{
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem;
            font-family: 'Space Mono', monospace;
            color: #ede0d5;
        }}
        
        .post-header {{
            margin-bottom: 2rem;
        }}
        
        .post-title {{
            color: #fff;
            font-size: 2rem;
            margin-bottom: 0.5rem;
        }}
        
        .post-date {{
            color: #33FF33;
            font-size: 0.9rem;
        }}
        
        .post-content {{
            line-height: 1.6;
        }}
        
        .post-content img {{
            max-width: 100%;
            border: 1px solid rgba(51, 255, 51, 0.3);
            border-radius: 4px;
        }}
        
        .post-content pre {{
            background: rgba(0, 0, 0, 0.5);
            padding: 1rem;
            border-radius: 4px;
            overflow-x: auto;
            border: 1px solid rgba(51, 255, 51, 0.2);
        }}
        
        .post-content code {{
            font-family: 'Space Mono', monospace;
            color: #33FF33;
        }}
        
        .post-content a {{
            color: #33FF33;
            text-decoration: none;
        }}
        
        .post-content a:hover {{
            text-decoration: underline;
        }}
        
        .back-link {{
            display: inline-block;
            margin-top: 2rem;
            color: #33FF33;
            text-decoration: none;
        }}
        
        .back-link:hover {{
            text-decoration: underline;
        }}
    </style>
</head>
<body>
    <div class="blog-post">
        <div class="post-header">
            <h1 class="post-title">{metadata['title']}</h1>
            <div class="post-date">{metadata['date']}</div>
        </div>
        
        <div class="post-content">
            {metadata['content']}
        </div>
        
        <a href="../index.html" class="back-link">← Back to all posts</a>
    </div>
</body>
</html>
"""
    
    with open(output_filename, 'w', encoding='utf-8') as f:
        f.write(html)
    
    return output_filename.relative_to(Path("blogs"))

def main():
    """Process all markdown files and generate the blog index."""
    posts = []
    
    # Process all markdown files
    for file_path in sorted(POSTS_DIR.glob('*.md'), reverse=True):
        try:
            print(f"Processing {file_path}...")
            metadata = parse_markdown_file(file_path)
            html_path = generate_html(metadata, file_path)
            
            posts.append({
                'title': metadata['title'],
                'date': metadata['date'],
                'preview': metadata['preview'],
                'url': str(html_path),
                'image': metadata.get('image', None)
            })
        except Exception as e:
            print(f"Error processing {file_path}: {e}")
    
    # Write posts.json
    with open(JSON_OUTPUT, 'w', encoding='utf-8') as f:
        json.dump(posts, f, indent=2)
    
    print(f"Generated {len(posts)} blog posts")

if __name__ == "__main__":
    main()
