from helpers import *
BANK = """[{"id":"b1","title":"علوم خامس","units":[{"id":"u1","name":"الوحدة الأولى: الماء","lessons":[{"id":"l1","name":"حالات الماء","qs":[
 {"q":"الماء يغلي عند درجة حرارة …","a":"100","ch":["100","50","0","200"]},
 {"q":"تحول الماء من سائل إلى غاز يسمى","a":"التبخر","ch":["التبخر","التكثف","التجمد","الانصهار"]},
 {"q":"كم حالة للماء؟","a":"٣"},
 {"q":"الثلج هو الماء في الحالة …","a":"الصلبة","ch":["الصلبة","السائلة","الغازية","البلازما"]},
 {"q":"أكبر مصدر للماء على الأرض","a":"المحيطات","ch":["المحيطات","الأنهار","الآبار","الأمطار"]}]}]}]}]"""
ANS = {"الماء يغلي عند درجة حرارة …":"100","تحول الماء من سائل إلى غاز يسمى":"التكثف","كم حالة للماء؟":"3","الثلج هو الماء في الحالة …":"الصلبة","أكبر مصدر للماء على الأرض":"المحيطات"}
r = Run()
t = teacher(r)
add_students(t, ["سارة أحمد", "عمر خالد", "ليان محمد"])
t.evaluate("b=>{ S.banks=JSON.parse(b); saveBanks(); }", BANK)
cs = codes(t)
t.click('.tb[data-tab="kit"]'); t.wait_for_timeout(600)
r.shot(t, "h0_kit")
t.click('.kt[data-k="hw"]'); t.wait_for_timeout(500)
t.click('#hwNew'); t.wait_for_timeout(500)
t.click('#nhC button[data-v="5"]'); t.wait_for_timeout(300)
r.shot(t, "h1_new")
t.click('#nhGo'); t.wait_for_timeout(1500)
r.shot(t, "h2_list")
# parent opens before the student solves
p = parent(r, cs[0][1])
p.click('.pkid[data-c]'); p.wait_for_timeout(900)
r.shot(p, "h3_parent_before")
# student
k = r.page("kid")
k.click('#kidBtn'); k.fill('#kCode', cs[0][1]); k.click('#kGo'); k.wait_for_selector('#kid.show', timeout=8000); k.wait_for_timeout(1500)
r.shot(k, "h4_kid_card")
k.click('.hwgo'); k.wait_for_timeout(1200)
for i in range(5):
    qt = k.inner_text('.hwq').strip()
    a = ANS[qt]
    if k.locator('.hwopt').count():
        k.locator('.hwopt', has_text=a).first.click()
    else:
        k.fill('#hwIn', a); k.click('#hwF button')
    k.wait_for_timeout(500)
    if i == 1: r.shot(k, "h5_kid_answer")
    k.click('#hwNext'); k.wait_for_timeout(700)
k.wait_for_timeout(1500)
r.shot(k, "h6_kid_done")
print("kid score:", k.inner_text('.hwsc'))
t.wait_for_timeout(1500)
print("teacher points:", t.evaluate("cls().students.map(s=>[s.name,s.points])"))
r.shot(t, "h7_teacher_after")
t.evaluate("openHomework()"); t.wait_for_timeout(600)
t.click('.hwrow'); t.wait_for_timeout(1200)
r.shot(t, "h8_results")
t.click('[data-sub]'); t.wait_for_timeout(500)
r.shot(t, "h9_review")
p.wait_for_timeout(1000)
r.shot(p, "h10_parent_after")
print("parent hw:", p.inner_text('#kHwCard').replace("\n"," | "))
k.evaluate("closeSheet()"); k.wait_for_timeout(800)
print("kid card:", k.inner_text('#kHwCard').replace("\n"," | "))
print("subs:", t.evaluate("Object.entries(__mockDB()).filter(([k])=>k.startsWith('subs/')).map(([k,v])=>[v.awarded,v.pts,v.score])"))
r.close()
