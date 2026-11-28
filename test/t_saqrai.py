# needs test/site/index.html patched with SAQR_AI_URL="https://saqr-ai.as01000as.workers.dev"
from helpers import *
import json
r = Run()
got = {}
def handle(route, req):
    if req.method == "OPTIONS": route.fulfill(status=204, headers={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"Authorization, Content-Type"}); return
    got["auth"] = req.headers.get("authorization"); got["body"] = json.loads(req.post_data)
    route.fulfill(json={"units":[{"name":"الوحدة الثانية","lessons":[{"name":"حالات المادة","qs":[{"q":"المادة التي لها شكل ثابت","a":"الصلبة","ch":["الصلبة","السائلة","الغازية"]}]}]}],"used":3,"limit":40},
                  headers={"Access-Control-Allow-Origin":"*"})
t = teacher(r)
t.route("**/saqr-ai.as01000as.workers.dev/**", handle)
t.evaluate("""()=>{ lsSet(AI_KEY,null); S.banks=[{id:"b1",title:"علوم خامس ابتدائي ف2",subject:"علوم",grade:"الخامس الابتدائي",term:"الفصل الثاني",units:[]}]; saveBanks(); openAIGen({bank:"b1"}); }""")
t.wait_for_timeout(600)
r.shot(t, "sa1_form")
print("terms:", t.eval_on_selector_all('#bmT option','os=>os.map(o=>o.textContent)'))
t.fill('#agU','الوحدة الثانية'); t.fill('#agL','حالات المادة'); t.click('#agGo'); t.wait_for_timeout(2000)
r.shot(t, "sa2_preview")
print("auth:", got.get("auth")); print("body:", got.get("body"))
print("preview:", t.inner_text('#sheet h2'))
r.close()
