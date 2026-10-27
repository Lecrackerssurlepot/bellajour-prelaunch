import zipfile, urllib.parse, base64, sys
K=72/25.4; PW=210*K; PH=297*K; HH=PH/2
NS='xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" DOMVersion="16.0"'
PI='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
D='/Users/mathiasdurand/Desktop/Lisbonne/'
PH_={'L1':(D+'2 Image 2026-09-07 at 08.30.49.jpeg',1600,900),'L2':(D+'3 Image 2026-09-07 at 08.30.49.jpeg',1600,900),
'L3':(D+'WhatsApp Image 2026-09-07 at 08.30.49.jpeg',1600,900),'P1':(D+'5 2026-09-07 at 08.30.50.jpeg',900,1600),'P2':(D+'4 Image 2026-09-07 at 08.30.50.jpeg',900,1600)}
uid=[100]
def nid(p='u'):
    uid[0]+=1; return f'{p}{uid[0]:x}'
def rect_pts(x,y,w,h):
    pts=[(x,y),(x,y+h),(x+w,y+h),(x+w,y)]
    return ''.join(f'<PathPointType Anchor="{a:.4f} {b:.4f}" LeftDirection="{a:.4f} {b:.4f}" RightDirection="{a:.4f} {b:.4f}"/>' for a,b in pts)
def geom(x,y,w,h):
    return f'<Properties><PathGeometry><GeometryPathType PathOpen="false"><PathPointArray>{rect_pts(x,y,w,h)}</PathPointArray></GeometryPathType></PathGeometry></Properties>'
def conv(spread_single, xmm,ymm,wmm,hmm):
    x = xmm*K if spread_single else (xmm-210)*K
    return x, ymm*K-HH, wmm*K, hmm*K
stories=[]
def photo(single,key,xmm,ymm,wmm,hmm,name):
    x,y,w,h=conv(single,xmm,ymm,wmm,hmm); path,iw,ih=PH_[key]
    s=max(w/iw,h/ih); tx=x+(w-iw*s)/2; ty=y+(h-ih*s)/2
    uri='file:'+urllib.parse.quote(path)
    return (f'<Rectangle Self="{nid()}" Name="{name}" ContentType="GraphicType" StoryTitle="$ID/" StrokeWeight="0" ItemTransform="1 0 0 1 0 0">{geom(x,y,w,h)}'
     f'<FrameFittingOption FittingOnEmptyFrame="FillProportionally" FittingAlignment="CenterAnchor"/>'
     f'<Image Self="{nid()}" ItemTransform="{s:.6f} 0 0 {s:.6f} {tx:.4f} {ty:.4f}" ActualPpi="72 72"><Properties><Profile type="string">$ID/Embedded</Profile><GraphicBounds Left="0" Top="0" Right="{iw}" Bottom="{ih}"/></Properties>'
     f'<Link Self="{nid()}" LinkResourceURI="{uri}" LinkResourceFormat="$ID/JPEG" StoredState="Normal"/></Image></Rectangle>')
def text(single,content,size,bold,xmm,ymm,wmm,hmm,name):
    x,y,w,h=conv(single,xmm,ymm,wmm,hmm); sid=nid('st')
    fs='Bold' if bold else 'Regular'
    stories.append((sid,f'<Story Self="{sid}" AppliedTOCStyle="n" StoryTitle="$ID/"><StoryPreference FrameType="TextFrameType" StoryOrientation="Horizontal" StoryDirection="LeftToRightDirection"/>'
      f'<ParagraphStyleRange AppliedParagraphStyle="ParagraphStyle/$ID/NormalParagraphStyle"><CharacterStyleRange AppliedCharacterStyle="CharacterStyle/$ID/[No character style]" PointSize="{size}" FontStyle="{fs}"><Properties><AppliedFont type="string">Arial</AppliedFont></Properties><Content>{content}</Content></CharacterStyleRange></ParagraphStyleRange></Story>'))
    return f'<TextFrame Self="{nid()}" Name="{name}" ParentStory="{sid}" ContentType="TextType" ItemTransform="1 0 0 1 0 0">{geom(x,y,w,h)}<TextFramePreference TextColumnCount="1"/></TextFrame>'
MP='<MarginPreference ColumnCount="6" ColumnGutter="{g}" Top="{t}" Bottom="{b}" Left="{l}" Right="{r}"/>'.format(g=5*K,t=15*K,b=20*K,l=20*K,r=15*K)
def page(pid,name,left):
    tx=-PW if left else 0
    return f'<Page Self="{pid}" Name="{name}" AppliedMaster="n" GeometricBounds="0 0 {PH:.4f} {PW:.4f}" ItemTransform="1 0 0 1 {tx:.4f} {-HH:.4f}">{MP}</Page>'
spreads=[]
# spread 1: page 1 alone (right)
s1=page('pg1','1',False)+text(True,'MAGAZINE TEST',40,True,15,30,175,20,'Titre couverture interieure')+photo(True,'L3',15,104,175,84,'Photo paysage')
spreads.append(('sp1',1,0,s1))
# spread 2: pages 2-3 (DP-01-like)
s2=page('pg2','2',True)+page('pg3','3',False)
s2+=photo(False,'P1',15,59.5,85,128.5,'Photo portrait 1')+photo(False,'P2',105,59.5,85,128.5,'Photo portrait 2')
s2+=photo(False,'L1',230,59.5,175,84,'Photo paysage droite')
s2+=text(False,'LISBONNE',60,True,230,193,175,30,'Titre')+text(False,'Légende de la double page, texte modifiable.',9,False,15,193,175,10,'Legende')
spreads.append(('sp2',2,1,s2))
# spread 3: pages 4-5 full bleed across gutter
s3=page('pg4','4',True)+page('pg5','5',False)
s3+=photo(False,'L2',-3,-3,426,303,'Photo pleine double page')+text(False,'TEXTE SUR PHOTO',24,True,230,255,175,15,'Titre sur photo')
spreads.append(('sp3',2,1,s3))
z=zipfile.ZipFile(sys.argv[1],'w')
z.writestr(zipfile.ZipInfo('mimetype'),'application/vnd.adobe.indesign-idml-package',compress_type=zipfile.ZIP_STORED)
def add(n,s): z.writestr(n,s,compress_type=zipfile.ZIP_DEFLATED)
add('META-INF/container.xml',PI+'<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="designmap.xml" media-type="text/xml"/></rootfiles></container>')
add('Resources/Graphic.xml',PI+f'<idPkg:Graphic {NS}><Color Self="Color/Black" Model="Process" Space="CMYK" ColorValue="0 0 0 100" Name="Black"/><Color Self="Color/Paper" Model="Process" Space="CMYK" ColorValue="0 0 0 0" Name="Paper"/><Swatch Self="Swatch/None" Name="None"/></idPkg:Graphic>')
add('Resources/Fonts.xml',PI+f'<idPkg:Fonts {NS}><FontFamily Self="di1" Name="Arial"><Font Self="di1Font1" FontFamily="Arial" Name="Arial Regular" PostScriptName="ArialMT" FontStyleName="Regular"/><Font Self="di1Font2" FontFamily="Arial" Name="Arial Bold" PostScriptName="Arial-BoldMT" FontStyleName="Bold"/></FontFamily></idPkg:Fonts>')
add('Resources/Styles.xml',PI+f'<idPkg:Styles {NS}><RootCharacterStyleGroup Self="rcs"><CharacterStyle Self="CharacterStyle/$ID/[No character style]" Name="$ID/[No character style]"/></RootCharacterStyleGroup><RootParagraphStyleGroup Self="rps"><ParagraphStyle Self="ParagraphStyle/$ID/[No paragraph style]" Name="$ID/[No paragraph style]"/><ParagraphStyle Self="ParagraphStyle/$ID/NormalParagraphStyle" Name="$ID/NormalParagraphStyle" PointSize="10" FillColor="Color/Black"><Properties><BasedOn type="object">ParagraphStyle/$ID/[No paragraph style]</BasedOn><AppliedFont type="string">Arial</AppliedFont></Properties></ParagraphStyle></RootParagraphStyleGroup><RootObjectStyleGroup Self="ros"><ObjectStyle Self="ObjectStyle/$ID/[None]" Name="$ID/[None]"/></RootObjectStyleGroup></idPkg:Styles>')
add('Resources/Preferences.xml',PI+f'<idPkg:Preferences {NS}><DocumentPreference PageHeight="{PH:.4f}" PageWidth="{PW:.4f}" PagesPerDocument="5" FacingPages="true" DocumentBleedTopOffset="{3*K:.4f}" DocumentBleedBottomOffset="{3*K:.4f}" DocumentBleedInsideOrLeftOffset="{3*K:.4f}" DocumentBleedOutsideOrRightOffset="{3*K:.4f}" DocumentBleedUniformSize="true" PageBinding="LeftToRight"/>{MP}</idPkg:Preferences>')
for sid,pc,bl,body in spreads:
    add(f'Spreads/Spread_{sid}.xml',PI+f'<idPkg:Spread {NS}><Spread Self="{sid}" PageCount="{pc}" BindingLocation="{bl}" ShowMasterItems="true" ItemTransform="1 0 0 1 0 0">{body}</Spread></idPkg:Spread>')
for sid,body in stories:
    add(f'Stories/Story_{sid}.xml',PI+f'<idPkg:Story {NS}>{body}</idPkg:Story>')
dm=PI+'<?aid style="50" type="document" readerVersion="6.0" featureSet="257" product="16.0(0)" ?>\n'+f'<Document {NS} Self="d" StoryList="{" ".join(s for s,_ in stories)}" ZeroPoint="0 0" ActiveLayer="ly1">'
dm+='<Language Self="Language/$ID/French" Name="$ID/French" SingleQuotes="‘’" DoubleQuotes="«»" PrimaryLanguageName="$ID/French" SublanguageName="$ID/" Id="268" HyphenationVendor="Hunspell" SpellingVendor="Hunspell"/>'
dm+='<idPkg:Graphic src="Resources/Graphic.xml"/><idPkg:Fonts src="Resources/Fonts.xml"/><idPkg:Styles src="Resources/Styles.xml"/><idPkg:Preferences src="Resources/Preferences.xml"/>'
dm+='<Layer Self="ly1" Name="Calque 1" Visible="true" Locked="false" Printable="true"/>'
for sid,*_ in spreads: dm+=f'<idPkg:Spread src="Spreads/Spread_{sid}.xml"/>'
dm+='<Section Self="sec1" Length="5" Name="" PageNumberStyle="Arabic" ContinueNumbering="true" IncludeSectionPrefix="false" PageStart="pg1" SectionPrefix=""/>'
for sid,_ in stories: dm+=f'<idPkg:Story src="Stories/Story_{sid}.xml"/>'
dm+='</Document>'
add('designmap.xml',dm)
z.close()
