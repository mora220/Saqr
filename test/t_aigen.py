from helpers import *
import json
r = Run()
p = r.page("guest")
seen = {}
def handle(route, req):
    if req.method == "GET":
        route.fulfill(json={"models":[{"name":"models/gemini-2.5-flash","supportedGenerationMethods":["generateContent"]}]})
    else:
        body = json.loads(req.post_data); seen["prompt"] = body["contents"][0]["parts"][0]["text"]
        out = {"units":[{"name":"الوحدة الثانية: المادة وتغيراتها","lessons":[{"name":"حالات المادة","qs":[
          {"q":"المادة التي لها شكل وحجم ثابتان هي","a":"الصلبة","wrong":["السائلة","الغازية","البلازما"]},
          {"q":"تحول المادة من الحالة الصلبة إلى السائلة يسمى","a":"الانصهار","wrong":["التجمد","التبخر","التكثف"]},
          {"q":"الغاز يأخذ شكل","a":"الإناء الذي يوضع فيه","wrong":["ثابت","مكعب","كروي"]}]}]}]}
        route.fulfill(json={"candidates":[{"content":{"parts":[{"text":json.dumps(out, ensure_ascii=False)}]}}]})
p.route("**/generativelanguage.googleapis.com/**", handle)
p.evaluate("localStorage.clear(); sessionStorage.clear()"); p.reload(); p.wait_for_timeout(900)
p.click("#guestBtn"); p.wait_for_selector("#grid .card", timeout=8000)
p.evaluate("""()=>{ lsSet(AI_KEY,'AIzaSyTEST_KEY_1234567890abcdefghijk'); S.banks=[{id:"b1",title:"علوم خامس ابتدائي ف2",subject:"علوم",grade:"الخامس الابتدائي",term:"الفصل الثاني",units:[]}]; saveBanks(); openBanks(); }""")
p.wait_for_timeout(600); r.shot(p, "g1_banks")
p.click('#aiGen'); p.wait_for_timeout(500)
p.click('#bmS [data-v="علوم"]'); p.select_option('#bmG','الخامس الابتدائي')
p.fill('#agU','الوحدة الثانية: المادة وتغيراتها'); p.fill('#agL','حالات المادة'); p.wait_for_timeout(200)
r.shot(p, "g2_form")
p.click('#agGo'); p.wait_for_timeout(2500)
r.shot(p, "g3_preview")
print("selected bank:", p.eval_on_selector('#apB','e=>e.value'))
p.click('#apSave'); p.wait_for_timeout(800)
r.shot(p, "g4_saved")
print(p.evaluate("JSON.stringify(S.banks.map(b=>[b.title,b.units.map(u=>[u.name,u.lessons.map(l=>[l.name,l.qs.length])])]))"))
print("prompt ok:", "حالات المادة" in seen.get("prompt","") and "الخامس الابتدائي" in seen.get("prompt",""))
# from add-question sheet
p.evaluate("openAddQ('b1')"); p.wait_for_timeout(500); p.click('#aqAI'); p.wait_for_timeout(500)
print("prefill:", p.input_value('#agU'), "|", p.input_value('#agL'))
r.close()
