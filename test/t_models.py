from helpers import *
import json
r = Run(); p = r.page("g"); calls=[]
def handle(route, req):
    if req.method == "GET":
        route.fulfill(json={"models":[{"name":"models/"+n,"supportedGenerationMethods":["generateContent"]} for n in ["gemini-2.5-flash","gemini-3-pro-preview","gemini-3.8-flash","gemini-3.8-flash-lite","gemini-flash-latest"]]}); return
    m=req.url.split("/models/")[1].split(":")[0]; body=json.loads(req.post_data); calls.append((m,"thinkingConfig" in body["generationConfig"]))
    if m=="gemini-3.8-flash": route.fulfill(status=404, json={"error":{"message":"This model models/gemini-3.8-flash is no longer available to new users."}}); return
    out={"units":[{"name":"و","lessons":[{"name":"د","qs":[{"q":"س","a":"ج","wrong":["x","y","z"]}]}]}]}
    route.fulfill(json={"candidates":[{"content":{"parts":[{"text":json.dumps(out)}]}}]})
p.route("**/generativelanguage.googleapis.com/**", handle)
p.evaluate("localStorage.clear(); sessionStorage.clear()"); p.reload(); p.wait_for_timeout(900)
p.click("#guestBtn"); p.wait_for_selector("#grid .card", timeout=8000)
res = p.evaluate("""async()=>{ lsSet(AI_KEY,'AIzaSyTEST_KEY_1234567890abcdefghijk'); await aiPickModel(aiKey()); const order=AIMODELS.map(m=>m.replace('models/',''));
  const r=await aiGenQs(aiKey(),{meta:{subject:'علوم',grade:'الخامس الابتدائي'},unit:'و',lesson:'د',n:3,mcq:true}); return [order, r.units.length]; }""")
print("order:", res[0]); print("units:", res[1]); print("calls:", calls)
r.close()
