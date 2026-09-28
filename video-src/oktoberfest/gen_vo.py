import json,soundfile as sf
from kokoro_onnx import Kokoro
k=Kokoro("kokoro.onnx","voices.bin")
S=[("hook","This is what one day at Oktoberfest really costs you."),
("i1","Three Mahss of beer? Fourteen hundred calories."),
("i2","A giant Bretsn. Four fifty."),
("i3","Half a Hendel. Seven hundred."),
("i4","A Shvines-haxa. Thirteen hundred!"),
("i5","And roasted almonds for the way home. Five hundred more."),
("total","Total: over four thousand three hundred calories. In one single day!"),
("burn","To burn that off, you'd have to run fifty five kilometers. That's more than a marathon!"),
("twist","But hey. Hendel plus Haxa is almost one fifty grams of protein. Protein goal: smashed."),
("cta","So enjoy the Veezn, and track it with Pumpy AI. Proast!")]
CAP={"i1":"Three Maß of beer? Fourteen hundred calories.","i2":"A giant Brezn. Four fifty.","i3":"Half a Hendl. Seven hundred.","i4":"A Schweinshaxe. Thirteen hundred!","twist":"But hey. Hendl plus Haxe is almost 150 grams of protein. Protein goal: smashed.","cta":"So enjoy the Wiesn, and track it with Pumpy AI. Prost!"}
out=[]
for sid,t in S:
    a,sr=k.create(t,voice="af_bella",speed=1.12,lang="en-us")
    sf.write(f"ok/vo/{sid}.wav",a,sr);out.append({"id":sid,"text":CAP.get(sid,t),"dur":len(a)/sr})
json.dump(out,open("ok/vo/segments.json","w"),indent=1)
print(round(sum(o["dur"] for o in out),1),[round(o["dur"],2) for o in out])
