url_path = 'e:/java/python-service/apps/core_ui/urls.py'
with open(url_path, 'r', encoding='utf-8') as f:
    urls = f.read()

new_urls = '''    # HTMX Feed Endpoints
    path("htmx/feed/", views.htmx_feed_posts, name="htmx_feed_posts"),
    path("htmx/feed/<uuid:post_id>/like/", views.htmx_like_post, name="htmx_like_post"),
]'''

urls = urls.replace(']', new_urls)
with open(url_path, 'w', encoding='utf-8') as f:
    f.write(urls)
print("Updated core_ui urls.py")
