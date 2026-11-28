import sys
from PIL import Image
names=sys.argv[2:]; out=sys.argv[1]
ims=[Image.open(f"shots/{n}.png") for n in names]
w=sum(i.width for i in ims); h=max(i.height for i in ims)
m=Image.new("RGB",(w,h),"white"); x=0
for i in ims: m.paste(i,(x,0)); x+=i.width
s=min(1, 1800/w); m.resize((int(w*s),int(h*s))).save(out)
