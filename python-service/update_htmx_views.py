import os
import re

path = 'e:/java/python-service/apps/booking/views.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace edit_profile
old_edit = '''
    if request.method == "POST":
        form = ProfileEditForm(request.POST, request.FILES, instance=request.user)
        if form.is_valid():
            form.save()
            messages.success(request, "Profil berhasil diperbarui.")
            return redirect("booking:edit_profile")
    else:
        form = ProfileEditForm(instance=request.user)
    
    return render(request, "booking/edit_profile.html", {"form": form})'''

new_edit = '''
    if request.method == "POST":
        form = ProfileEditForm(request.POST, request.FILES, instance=request.user)
        if form.is_valid():
            form.save()
            messages.success(request, "Profil berhasil diperbarui.")
            if request.headers.get('HX-Request'):
                response = render(request, "booking/edit_profile.html", {"form": form})
                response['HX-Push-Url'] = request.path
                return response
            return redirect("booking:edit_profile")
    else:
        form = ProfileEditForm(instance=request.user)
    
    if request.headers.get('HX-Request') and request.method == "POST":
        return render(request, "booking/edit_profile.html", {"form": form})
    return render(request, "booking/edit_profile.html", {"form": form})'''

content = content.replace(old_edit, new_edit)

# Replace settings
old_settings = '''
    if request.method == "POST":
        form = SettingsForm(request.POST, instance=request.user)
        if form.is_valid():
            form.save()
            messages.success(request, "Pengaturan berhasil disimpan.")
            return redirect("booking:settings")
    else:
        form = SettingsForm(instance=request.user)
    
    return render(request, "booking/settings.html", {"form": form})'''

new_settings = '''
    if request.method == "POST":
        form = SettingsForm(request.POST, instance=request.user)
        if form.is_valid():
            form.save()
            messages.success(request, "Pengaturan berhasil disimpan.")
            if request.headers.get('HX-Request'):
                response = render(request, "booking/settings.html", {"form": form})
                response['HX-Push-Url'] = request.path
                return response
            return redirect("booking:settings")
    else:
        form = SettingsForm(instance=request.user)
    
    if request.headers.get('HX-Request') and request.method == "POST":
        return render(request, "booking/settings.html", {"form": form})
    return render(request, "booking/settings.html", {"form": form})'''

content = content.replace(old_settings, new_settings)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated views.py for HTMX")
