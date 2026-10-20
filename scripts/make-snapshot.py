"""Rebuild the small, explicitly reviewed starter snapshot; not an online importer."""
import json,uuid,pathlib,hashlib
ROOT=pathlib.Path(__file__).resolve().parents[1]
def uid(k):
 b=bytearray(hashlib.sha256(('btf:'+k).encode()).digest()[:16]);b[6]=(b[6]&15)|80;b[8]=(b[8]&63)|128;return str(uuid.UUID(bytes=bytes(b)))
identities=json.loads((ROOT/'data/identity-map.json').read_text())
def source(q): return dict(name='Wikidata',externalId=q,url='https://www.wikidata.org/wiki/'+q,license='CC0-1.0',checkedAt='2026-10-20',status='source-checked',note='Checked against structured statements; not independently audited against screen credits.')
# A person key is an explicit editorial identity mapping corroborated by credited film/role.
# No fuzzy-name merging. Online ingestion uses Wikidata QIDs instead.
records=[
('Q60737728','Kumbalangi Nights',2019,'Malayalam',['Drama','Romance'],[('Shyju Khalid','Cinematography','Director of photography'),('Sushin Shyam','Music composition','Composer')]),
('Q124636001','Manjummel Boys',2024,'Malayalam',['Thriller','Adventure'],[('Shyju Khalid','Cinematography','Director of photography'),('Vivek Harshan','Film editing','Film editor'),('Sushin Shyam','Music composition','Composer')]),
('Q16837651','Bangalore Days',2014,'Malayalam',['Drama','Romance'],[('Sameer Thahir','Cinematography','Director of photography'),('Praveen Prabhakar','Film editing','Film editor'),('Gopi Sundar','Music composition','Composer')]),
('Q23681158','Maheshinte Prathikaaram',2016,'Malayalam',['Drama','Comedy'],[('Shyju Khalid','Cinematography','Director of photography'),('Bijibal','Music composition','Composer')]),
('Q19895421','Premam',2015,'Malayalam',['Romance','Comedy'],[('Alphonse Puthren','Film editing','Film editor'),('Rajesh Murugesan','Music composition','Composer')]),
('Q21500755','Blade Runner 2049',2017,'Hollywood',['Science fiction','Thriller','Drama'],[('Roger Deakins','Cinematography','Director of photography'),('Joe Walker','Film editing','Film editor'),('Dennis Gassner','Production design','Production designer'),('Renée April','Costume design','Costume designer'),('Hans Zimmer','Music composition','Composer'),('Benjamin Wallfisch','Music composition','Composer')]),
('Q13417189','Interstellar',2014,'Hollywood',['Science fiction','Drama','Adventure'],[('Hoyte van Hoytema','Cinematography','Director of photography'),('Lee Smith','Film editing','Film editor'),('Nathan Crowley','Production design','Production designer'),('Mary Zophres','Costume design','Costume designer'),('Paul Franklin','Visual effects','Visual effects supervisor'),('Hans Zimmer','Music composition','Composer')]),
('Q4941','Skyfall',2012,'Hollywood',['Action','Thriller'],[('Roger Deakins','Cinematography','Director of photography'),('Stuart Baird','Film editing','Film editor'),('Dennis Gassner','Production design','Production designer'),('Thomas Newman','Music composition','Composer')]),
('Q21935651','Dunkirk',2017,'Hollywood',['War','Drama','Thriller'],[('Hoyte van Hoytema','Cinematography','Director of photography'),('Lee Smith','Film editing','Film editor'),('Nathan Crowley','Production design','Production designer'),('Jeffrey Kurland','Costume design','Costume designer'),('Hans Zimmer','Music composition','Composer')]),
]
# The fifth Hollywood film is source-backed by the official Academy record below.
records.append(('academy-1917','1917',2019,'Hollywood',['War','Drama'],[('Roger Deakins','Cinematography','Cinematography'),('Thomas Newman','Music composition','Original score')]))
films=[]; people={}; colors=['#516b65','#75594f','#535d68','#78664f','#59615d','#5c616f','#77614d','#605a71']
for q,title,year,industry,genres,crew in records:
 s=source(q)
 if q=='academy-1917':
  s=dict(name='Academy of Motion Picture Arts and Sciences',externalId='2020/1917',url='https://www.oscars.org/oscars/ceremonies/2020',license='Factual credit metadata; no images or prose copied',checkedAt='2026-10-20',status='source-checked',note='Award-category credits, not the complete production crew.')
 fid=uid('movie/'+q); credits=[]
 for name,dep,role in crew:
  pid=uid('person/'+identities[name])
  if name not in people:
   people[name]=dict(id=pid,externalId=identities[name],name=name,alternativeNames=[],department=dep,subtitle=dep+' professional',bio=None,styles=[],color=colors[len(people)%len(colors)],initials=''.join(x[0] for x in name.split() if x.lower() not in ['van'])[:2],source=s)
  credits.append(dict(person=pid,role=role,department=dep,source=s))
 films.append(dict(id=fid,externalId=q,title=title,originalTitle=title,year=year,language='Malayalam' if industry=='Malayalam' else 'English',countries=['India'] if industry=='Malayalam' else ['United Kingdom','United States'],industry=industry,genres=genres,synopsis=None,runtime=None,color=colors[len(films)%len(colors)],crew=credits,source=s))
# Countries/genres here are editorial discovery metadata, source-check separately from credits.
# Restrict unsupported production countries to unavailable for this starter batch.
for f in films:
 if f['industry']=='Hollywood': f['countries']=[]
 if f['title']=='Bangalore Days': f['runtime']=171
 if f['title']=='Premam': f['runtime']=156
 if f['title']=='Manjummel Boys': f['runtime']=135
annotations=[]
def annotate(name,title,tag,note,url,publisher):
 p=people[name]; f=next(f for f in films if f['title']==title)
 annotations.append(dict(person=p['id'],film=f['id'],tag=tag,note=note,source=dict(name=publisher,externalId=url,url=url,license='Original editorial annotation based on a published interview; no article text copied',checkedAt='2026-10-20',status='source-checked')))
 p['styles'].append(tag)
annotate('Roger Deakins','Blade Runner 2049','Atmospheric cinematography','Editorial interpretation: moving light and shadow shape the atmosphere of Wallace’s room.','https://www.arri.com/news/news/lighting-blade-runner-2049/','ARRI / Bill O’Leary interview')
annotate('Roger Deakins','Blade Runner 2049','High-contrast lighting','Editorial interpretation: the interview describes designed beams and controlled shadows, supporting this film-specific tag.','https://theasc.com/article/uncanny-valley-blade-runner-2049/','American Society of Cinematographers')
annotate('Shyju Khalid','Kumbalangi Nights','Naturalistic visuals','Editorial interpretation: Khalid discusses adapting lighting to the story and locations; this is not a measured career-wide trait.','https://scroll.in/reel/996139/nayattu-cinematographer-shyju-khalid-on-new-malayalam-cinema-the-aesthetic-and-emotions-connect','Scroll / Shyju Khalid interview')
# These genres are curated categorical labels, not imported descriptive prose or model-generated plots.
result=dict(films=films,people=list(people.values()),annotations=annotations)
(ROOT/'data/catalogue.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(f'{len(films)} films; {len(people)} technicians; {sum(len(f["crew"]) for f in films)} credits; {len(annotations)} annotations')
