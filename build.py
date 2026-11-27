import base64, pathlib
src = pathlib.Path("src/app.html").read_text(encoding="utf-8")
fdir = pathlib.Path("node_modules/@fontsource/baloo-bhaijaan-2/files")
css = ""
for w in (500,700,800):
    for sub, rng in (("arabic","U+0600-06FF, U+0750-077F, U+0870-088E, U+0890-0891, U+0897-08E1, U+08E3-08FF, U+200C-200E, U+2010-2011, U+204F, U+2E41, U+FB50-FDFF, U+FE70-FE74, U+FE76-FEFC"),("latin","U+0000-00FF, U+2000-206F, U+20AC, U+2122, U+2212")):
        b = base64.b64encode((fdir/f"baloo-bhaijaan-2-{sub}-{w}-normal.woff2").read_bytes()).decode()
        css += f"@font-face{{font-family:'Baloo Bhaijaan 2';font-style:normal;font-display:swap;font-weight:{w};src:url(data:font/woff2;base64,{b}) format('woff2');unicode-range:{rng};}}\n"
gsap = pathlib.Path("node_modules/gsap/dist/gsap.min.js").read_text(encoding="utf-8")
out = src.replace("/*FONTS*/", css).replace("<script>/*GSAP*/</script>", "<script>"+gsap+"</script>")
pathlib.Path("dist").mkdir(exist_ok=True)
pathlib.Path("dist/index.html").write_text(out, encoding="utf-8")
print(len(out)//1024, "KB")

import subprocess
subprocess.run(["npx","esbuild","src/cloud.js","--bundle","--format=esm","--minify","--target=es2020","--outfile=dist/cloud.js"],check=True)
subprocess.run(["npx","esbuild","src/sw.js","--bundle","--format=iife","--minify","--target=es2020","--outfile=dist/sw.js"],check=True)
import shutil
for f in ("manifest.webmanifest",): shutil.copy("src/"+f,"dist/"+f)
pathlib.Path("dist/icons").mkdir(exist_ok=True)
for f in pathlib.Path("src/icons").glob("*.png"): shutil.copy(f,"dist/icons/"+f.name)
pathlib.Path("dist/emoji").mkdir(exist_ok=True)
for f in pathlib.Path("src/emoji").glob("*"):
    if f.suffix in (".svg",".txt"): shutil.copy(f,"dist/emoji/"+f.name)
shutil.copy("node_modules/lottie-web/build/player/lottie_light.min.js","dist/lottie.js")
pathlib.Path("dist/lottie").mkdir(exist_ok=True)
for f in pathlib.Path("src/lottie").glob("*.json"): shutil.copy(f,"dist/lottie/"+f.name)
