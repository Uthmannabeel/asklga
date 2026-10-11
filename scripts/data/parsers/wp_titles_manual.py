"""Run after wp_list.py: article titles for LGAs that "Local government areas of Nigeria" lists wrongly or not at all."""
import json
m = json.load(open("work_wp_titles.json"))
add = {"fufore": "Fufure", "damban": "Dambam", "afikpo-north": "Afikpo North", "afikpo-south": "Afikpo South", "kunchi": "Kunchi", "danko-wasagu": "Wasagu/Danko",
       "ile-oluji-okeigbo": "Ile Oluji/Okeigbo", "kajola": "Kajola", "ori-ire": "Orire", "surulere-oyo": "Surulere, Oyo State", "okrika": "Okrika", "isa": "Isa, Nigeria",
       "kebbe": "Kebbe", "shagari": "Shagari, Nigeria", "yabo": "Yabo", "bursari": "Bursari", "bakura": "Bakura, Nigeria"}
for k, v in add.items(): m[k] = {"title": v, "label": v, "state": None, "manual": True}
json.dump(m, open("work_wp_titles.json", "w"), indent=0); print(len(m))
