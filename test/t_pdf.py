from helpers import *
import subprocess
r = Run()
t = teacher(r)
add_students(t, ["سارة أحمد", "عمر خالد", "ليان محمد"])
cs = codes(t)
t.evaluate("""()=>{ const c=cls(), P=allSkills().filter(k=>k.v>0), N=allSkills().filter(k=>k.v<0);
  const s=c.students[0], now=Date.now();
  for(let w=0;w<8;w++) for(let j=0;j<(w%3)+2;j++){ const k=P[(w+j)%P.length]; c.log.push({sid:s.id,k:k.k,v:k.v,t:now-w*7*864e5-j*3600e3,e:k.e,nm:k.t}); s.points+=k.v; s.pos++; }
  c.log.push({sid:s.id,k:N[0].k,v:N[0].v,t:now-3600e3,e:N[0].e,nm:N[0].t}); s.points+=N[0].v;
  c.log.push({sid:c.students[1].id,k:P[0].k,v:3,t:now-7200e3,e:P[0].e,nm:P[0].t}); c.students[1].points+=3;
  c.hw=[{id:"h1",title:"حالات الماء",due:now+864e5,at:now-864e5,pts:3,n:5,done:1,sum:.8},{id:"h2",title:"الدورة المائية",due:now+2*864e5,at:now-3600e3,pts:3,n:10,done:0,sum:0}];
  s.hwd={h1:[4,5]}; c.att=c.att||{}; checkBadges(s,c,true); save(); render(); }""")
t.wait_for_timeout(1500)
t.click('.tb[data-tab="report"]'); t.wait_for_timeout(600)
t.click('[data-rt="stu"]'); t.wait_for_timeout(600)
t.click('#srPdf'); t.wait_for_timeout(1200)
r.shot(t, "p1_preview")
# capture the real print output
t.evaluate("window.print=()=>{}")
t.click('#rpGo'); t.wait_for_timeout(1500)
t.emulate_media(media="print")
t.pdf(path="shots/report.pdf", prefer_css_page_size=True, print_background=True)
t.emulate_media(media="screen")
t.evaluate("openCert(cls().students[0].id)"); t.wait_for_timeout(1000)
r.shot(t, "p2_cert")
t.click('#ceGo'); t.wait_for_timeout(1500)
t.emulate_media(media="print"); t.pdf(path="shots/cert.pdf", prefer_css_page_size=True, print_background=True); t.emulate_media(media="screen")
# whole class
t.evaluate("closeSheet(); printClassReports()"); t.wait_for_timeout(1500)
t.emulate_media(media="print"); t.pdf(path="shots/class.pdf", prefer_css_page_size=True, print_background=True); t.emulate_media(media="screen")
# parent
p = parent(r, cs[0][1]); p.click('.pkid[data-c]'); p.wait_for_timeout(1500)
p.evaluate("window.print=()=>{}")
p.click('#kPdf'); p.wait_for_timeout(1000); r.shot(p, "p3_parent")
p.click('#prGo'); p.wait_for_timeout(1500)
p.emulate_media(media="print"); p.pdf(path="shots/parent.pdf", prefer_css_page_size=True, print_background=True)
r.close()
for f in ["report","cert","class","parent"]:
    out = subprocess.run(["pdfinfo", f"shots/{f}.pdf"], capture_output=True, text=True).stdout
    print(f, [l for l in out.splitlines() if l.startswith(("Pages","Page size"))])
