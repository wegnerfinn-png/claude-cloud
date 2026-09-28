import json,sys,soundfile as sf
from kokoro_onnx import Kokoro
k=Kokoro("kokoro.onnx","voices.bin")
voice=sys.argv[1] if len(sys.argv)>1 else "af_bella"
S=[("hook","Stop! Three protein myths are killing your gains."),
("m1q","Myth number one: your body can only use thirty grams of protein per meal."),
("m1a","Wrong! In a 2023 study, people ate one hundred grams at once, and muscle building just kept going for hours."),
("m2q","Myth number two: eating late makes you fat."),
("m2a","Nope! Your daily calories decide. The clock doesn't care."),
("m3q","Myth number three: high protein destroys your kidneys."),
("m3a","In healthy people? No evidence. Even at two grams per kilo."),
("twist","The real problem? You're guessing your protein."),
("app","Pumpy AI tracks every single gram, so you always know exactly where you stand."),
("cta","Stop guessing. Start growing. Download Pumpy AI!")]
out=[]
for i,(sid,t) in enumerate(S):
    a,sr=k.create(t,voice=voice,speed=1.12,lang="en-us")
    sf.write(f"vo/{sid}.wav",a,sr);out.append({"id":sid,"text":t,"dur":len(a)/sr,"sr":sr})
json.dump(out,open("vo/segments.json","w"),indent=1)
print(sum(o["dur"] for o in out),[round(o["dur"],2) for o in out])
