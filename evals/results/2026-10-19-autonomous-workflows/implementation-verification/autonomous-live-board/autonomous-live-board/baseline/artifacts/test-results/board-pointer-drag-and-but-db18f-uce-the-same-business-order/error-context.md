# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: board.spec.mjs >> pointer drag and buttons produce the same business order
- Location: tests/board.spec.mjs:24:1

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 1
+ Received  + 1

  Array [
    "2",
-   "3",
    "1",
+   "3",
  ]

Call Log:
- Timeout 5000ms exceeded while waiting on the predicate
```

# Page snapshot

```yaml
- main [ref=e2]:
  - button "Hide board" [ref=e3]
  - status [ref=e4]: Saved
  - list "Board" [ref=e5]:
    - listitem [ref=e6]:
      - heading "Card 2" [level=2] [ref=e7]
      - paragraph [ref=e8]: Card content Card content
      - generic [ref=e9]:
        - button "Move up" [disabled] [ref=e10]
        - button "Move down" [ref=e11]
        - button "Move card 2" [ref=e12]
    - listitem [ref=e13]:
      - heading "Card 1" [level=2] [ref=e14]
      - paragraph [ref=e15]: Card content
      - generic [ref=e16]:
        - button "Move up" [ref=e17]
        - button "Move down" [ref=e18]
        - button "Move card 1" [pressed] [ref=e19]
    - listitem [ref=e20]:
      - heading "Card 3" [level=2] [ref=e21]
      - paragraph [ref=e22]: Card content Card content Card content
      - generic [ref=e23]:
        - button "Move up" [ref=e24]
        - button "Move down" [ref=e25]
        - button "Move card 3" [ref=e26]
    - listitem [ref=e27]:
      - heading "Card 4" [level=2] [ref=e28]
      - paragraph [ref=e29]: Card content Card content Card content Card content
      - generic [ref=e30]:
        - button "Move up" [ref=e31]
        - button "Move down" [ref=e32]
        - button "Move card 4" [ref=e33]
    - listitem [ref=e34]:
      - heading "Card 5" [level=2] [ref=e35]
      - paragraph [ref=e36]: Card content Card content Card content Card content Card content
      - generic [ref=e37]:
        - button "Move up" [ref=e38]
        - button "Move down" [ref=e39]
        - button "Move card 5" [ref=e40]
    - listitem [ref=e41]:
      - heading "Card 6" [level=2] [ref=e42]
      - paragraph [ref=e43]: Card content Card content Card content Card content Card content Card content
      - generic [ref=e44]:
        - button "Move up" [ref=e45]
        - button "Move down" [ref=e46]
        - button "Move card 6" [ref=e47]
    - listitem [ref=e48]:
      - heading "Card 7" [level=2] [ref=e49]
      - paragraph [ref=e50]: Card content Card content Card content Card content Card content Card content Card content
      - generic [ref=e51]:
        - button "Move up" [ref=e52]
        - button "Move down" [ref=e53]
        - button "Move card 7" [ref=e54]
    - listitem [ref=e55]:
      - heading "Card 8" [level=2] [ref=e56]
      - paragraph [ref=e57]: Card content
      - generic [ref=e58]:
        - button "Move up" [ref=e59]
        - button "Move down" [ref=e60]
        - button "Move card 8" [ref=e61]
    - listitem [ref=e62]:
      - heading "Card 9" [level=2] [ref=e63]
      - paragraph [ref=e64]: Card content Card content
      - generic [ref=e65]:
        - button "Move up" [ref=e66]
        - button "Move down" [ref=e67]
        - button "Move card 9" [ref=e68]
    - listitem [ref=e69]:
      - heading "Card 10" [level=2] [ref=e70]
      - paragraph [ref=e71]: Card content Card content Card content
      - generic [ref=e72]:
        - button "Move up" [ref=e73]
        - button "Move down" [ref=e74]
        - button "Move card 10" [ref=e75]
    - listitem [ref=e76]:
      - heading "Card 11" [level=2] [ref=e77]
      - paragraph [ref=e78]: Card content Card content Card content Card content
      - generic [ref=e79]:
        - button "Move up" [ref=e80]
        - button "Move down" [ref=e81]
        - button "Move card 11" [ref=e82]
    - listitem [ref=e83]:
      - heading "Card 12" [level=2] [ref=e84]
      - paragraph [ref=e85]: Card content Card content Card content Card content Card content
      - generic [ref=e86]:
        - button "Move up" [ref=e87]
        - button "Move down" [ref=e88]
        - button "Move card 12" [ref=e89]
    - listitem [ref=e90]:
      - heading "Card 13" [level=2] [ref=e91]
      - paragraph [ref=e92]: Card content Card content Card content Card content Card content Card content
      - generic [ref=e93]:
        - button "Move up" [ref=e94]
        - button "Move down" [ref=e95]
        - button "Move card 13" [ref=e96]
    - listitem [ref=e97]:
      - heading "Card 14" [level=2] [ref=e98]
      - paragraph [ref=e99]: Card content Card content Card content Card content Card content Card content Card content
      - generic [ref=e100]:
        - button "Move up" [ref=e101]
        - button "Move down" [ref=e102]
        - button "Move card 14" [ref=e103]
    - listitem [ref=e104]:
      - heading "Card 15" [level=2] [ref=e105]
      - paragraph [ref=e106]: Card content
      - generic [ref=e107]:
        - button "Move up" [ref=e108]
        - button "Move down" [ref=e109]
        - button "Move card 15" [ref=e110]
    - listitem [ref=e111]:
      - heading "Card 16" [level=2] [ref=e112]
      - paragraph [ref=e113]: Card content Card content
      - generic [ref=e114]:
        - button "Move up" [ref=e115]
        - button "Move down" [ref=e116]
        - button "Move card 16" [ref=e117]
    - listitem [ref=e118]:
      - heading "Card 17" [level=2] [ref=e119]
      - paragraph [ref=e120]: Card content Card content Card content
      - generic [ref=e121]:
        - button "Move up" [ref=e122]
        - button "Move down" [ref=e123]
        - button "Move card 17" [ref=e124]
    - listitem [ref=e125]:
      - heading "Card 18" [level=2] [ref=e126]
      - paragraph [ref=e127]: Card content Card content Card content Card content
      - generic [ref=e128]:
        - button "Move up" [ref=e129]
        - button "Move down" [ref=e130]
        - button "Move card 18" [ref=e131]
    - listitem [ref=e132]:
      - heading "Card 19" [level=2] [ref=e133]
      - paragraph [ref=e134]: Card content Card content Card content Card content Card content
      - generic [ref=e135]:
        - button "Move up" [ref=e136]
        - button "Move down" [ref=e137]
        - button "Move card 19" [ref=e138]
    - listitem [ref=e139]:
      - heading "Card 20" [level=2] [ref=e140]
      - paragraph [ref=e141]: Card content Card content Card content Card content Card content Card content
      - generic [ref=e142]:
        - button "Move up" [ref=e143]
        - button "Move down" [ref=e144]
        - button "Move card 20" [ref=e145]
    - listitem [ref=e146]:
      - heading "Card 21" [level=2] [ref=e147]
      - paragraph [ref=e148]: Card content Card content Card content Card content Card content Card content Card content
      - generic [ref=e149]:
        - button "Move up" [ref=e150]
        - button "Move down" [ref=e151]
        - button "Move card 21" [ref=e152]
    - listitem [ref=e153]:
      - heading "Card 22" [level=2] [ref=e154]
      - paragraph [ref=e155]: Card content
      - generic [ref=e156]:
        - button "Move up" [ref=e157]
        - button "Move down" [ref=e158]
        - button "Move card 22" [ref=e159]
    - listitem [ref=e160]:
      - heading "Card 23" [level=2] [ref=e161]
      - paragraph [ref=e162]: Card content Card content
      - generic [ref=e163]:
        - button "Move up" [ref=e164]
        - button "Move down" [ref=e165]
        - button "Move card 23" [ref=e166]
    - listitem [ref=e167]:
      - heading "Card 24" [level=2] [ref=e168]
      - paragraph [ref=e169]: Card content Card content Card content
      - generic [ref=e170]:
        - button "Move up" [ref=e171]
        - button "Move down" [ref=e172]
        - button "Move card 24" [ref=e173]
    - listitem [ref=e174]:
      - heading "Card 25" [level=2] [ref=e175]
      - paragraph [ref=e176]: Card content Card content Card content Card content
      - generic [ref=e177]:
        - button "Move up" [ref=e178]
        - button "Move down" [ref=e179]
        - button "Move card 25" [ref=e180]
    - listitem [ref=e181]:
      - heading "Card 26" [level=2] [ref=e182]
      - paragraph [ref=e183]: Card content Card content Card content Card content Card content
      - generic [ref=e184]:
        - button "Move up" [ref=e185]
        - button "Move down" [ref=e186]
        - button "Move card 26" [ref=e187]
    - listitem [ref=e188]:
      - heading "Card 27" [level=2] [ref=e189]
      - paragraph [ref=e190]: Card content Card content Card content Card content Card content Card content
      - generic [ref=e191]:
        - button "Move up" [ref=e192]
        - button "Move down" [ref=e193]
        - button "Move card 27" [ref=e194]
    - listitem [ref=e195]:
      - heading "Card 28" [level=2] [ref=e196]
      - paragraph [ref=e197]: Card content Card content Card content Card content Card content Card content Card content
      - generic [ref=e198]:
        - button "Move up" [ref=e199]
        - button "Move down" [ref=e200]
        - button "Move card 28" [ref=e201]
    - listitem [ref=e202]:
      - heading "Card 29" [level=2] [ref=e203]
      - paragraph [ref=e204]: Card content
      - generic [ref=e205]:
        - button "Move up" [ref=e206]
        - button "Move down" [ref=e207]
        - button "Move card 29" [ref=e208]
    - listitem [ref=e209]:
      - heading "Card 30" [level=2] [ref=e210]
      - paragraph [ref=e211]: Card content Card content
      - generic [ref=e212]:
        - button "Move up" [ref=e213]
        - button "Move down" [ref=e214]
        - button "Move card 30" [ref=e215]
    - listitem [ref=e216]:
      - heading "Card 31" [level=2] [ref=e217]
      - paragraph [ref=e218]: Card content Card content Card content
      - generic [ref=e219]:
        - button "Move up" [ref=e220]
        - button "Move down" [ref=e221]
        - button "Move card 31" [ref=e222]
    - listitem [ref=e223]:
      - heading "Card 32" [level=2] [ref=e224]
      - paragraph [ref=e225]: Card content Card content Card content Card content
      - generic [ref=e226]:
        - button "Move up" [ref=e227]
        - button "Move down" [ref=e228]
        - button "Move card 32" [ref=e229]
    - listitem [ref=e230]:
      - heading "Card 33" [level=2] [ref=e231]
      - paragraph [ref=e232]: Card content Card content Card content Card content Card content
      - generic [ref=e233]:
        - button "Move up" [ref=e234]
        - button "Move down" [ref=e235]
        - button "Move card 33" [ref=e236]
    - listitem [ref=e237]:
      - heading "Card 34" [level=2] [ref=e238]
      - paragraph [ref=e239]: Card content Card content Card content Card content Card content Card content
      - generic [ref=e240]:
        - button "Move up" [ref=e241]
        - button "Move down" [ref=e242]
        - button "Move card 34" [ref=e243]
    - listitem [ref=e244]:
      - heading "Card 35" [level=2] [ref=e245]
      - paragraph [ref=e246]: Card content Card content Card content Card content Card content Card content Card content
      - generic [ref=e247]:
        - button "Move up" [ref=e248]
        - button "Move down" [ref=e249]
        - button "Move card 35" [ref=e250]
    - listitem [ref=e251]:
      - heading "Card 36" [level=2] [ref=e252]
      - paragraph [ref=e253]: Card content
      - generic [ref=e254]:
        - button "Move up" [ref=e255]
        - button "Move down" [ref=e256]
        - button "Move card 36" [ref=e257]
    - listitem [ref=e258]:
      - heading "Card 37" [level=2] [ref=e259]
      - paragraph [ref=e260]: Card content Card content
      - generic [ref=e261]:
        - button "Move up" [ref=e262]
        - button "Move down" [ref=e263]
        - button "Move card 37" [ref=e264]
    - listitem [ref=e265]:
      - heading "Card 38" [level=2] [ref=e266]
      - paragraph [ref=e267]: Card content Card content Card content
      - generic [ref=e268]:
        - button "Move up" [ref=e269]
        - button "Move down" [ref=e270]
        - button "Move card 38" [ref=e271]
    - listitem [ref=e272]:
      - heading "Card 39" [level=2] [ref=e273]
      - paragraph [ref=e274]: Card content Card content Card content Card content
      - generic [ref=e275]:
        - button "Move up" [ref=e276]
        - button "Move down" [ref=e277]
        - button "Move card 39" [ref=e278]
    - listitem [ref=e279]:
      - heading "Card 40" [level=2] [ref=e280]
      - paragraph [ref=e281]: Card content Card content Card content Card content Card content
      - generic [ref=e282]:
        - button "Move up" [ref=e283]
        - button "Move down" [ref=e284]
        - button "Move card 40" [ref=e285]
    - listitem [ref=e286]:
      - heading "Card 41" [level=2] [ref=e287]
      - paragraph [ref=e288]: Card content Card content Card content Card content Card content Card content
      - generic [ref=e289]:
        - button "Move up" [ref=e290]
        - button "Move down" [ref=e291]
        - button "Move card 41" [ref=e292]
    - listitem [ref=e293]:
      - heading "Card 42" [level=2] [ref=e294]
      - paragraph [ref=e295]: Card content Card content Card content Card content Card content Card content Card content
      - generic [ref=e296]:
        - button "Move up" [ref=e297]
        - button "Move down" [ref=e298]
        - button "Move card 42" [ref=e299]
    - listitem [ref=e300]:
      - heading "Card 43" [level=2] [ref=e301]
      - paragraph [ref=e302]: Card content
      - generic [ref=e303]:
        - button "Move up" [ref=e304]
        - button "Move down" [ref=e305]
        - button "Move card 43" [ref=e306]
    - listitem [ref=e307]:
      - heading "Card 44" [level=2] [ref=e308]
      - paragraph [ref=e309]: Card content Card content
      - generic [ref=e310]:
        - button "Move up" [ref=e311]
        - button "Move down" [ref=e312]
        - button "Move card 44" [ref=e313]
    - listitem [ref=e314]:
      - heading "Card 45" [level=2] [ref=e315]
      - paragraph [ref=e316]: Card content Card content Card content
      - generic [ref=e317]:
        - button "Move up" [ref=e318]
        - button "Move down" [ref=e319]
        - button "Move card 45" [ref=e320]
    - listitem [ref=e321]:
      - heading "Card 46" [level=2] [ref=e322]
      - paragraph [ref=e323]: Card content Card content Card content Card content
      - generic [ref=e324]:
        - button "Move up" [ref=e325]
        - button "Move down" [ref=e326]
        - button "Move card 46" [ref=e327]
    - listitem [ref=e328]:
      - heading "Card 47" [level=2] [ref=e329]
      - paragraph [ref=e330]: Card content Card content Card content Card content Card content
      - generic [ref=e331]:
        - button "Move up" [ref=e332]
        - button "Move down" [ref=e333]
        - button "Move card 47" [ref=e334]
    - listitem [ref=e335]:
      - heading "Card 48" [level=2] [ref=e336]
      - paragraph [ref=e337]: Card content Card content Card content Card content Card content Card content
      - generic [ref=e338]:
        - button "Move up" [ref=e339]
        - button "Move down" [ref=e340]
        - button "Move card 48" [ref=e341]
    - listitem [ref=e342]:
      - heading "Card 49" [level=2] [ref=e343]
      - paragraph [ref=e344]: Card content Card content Card content Card content Card content Card content Card content
      - generic [ref=e345]:
        - button "Move up" [ref=e346]
        - button "Move down" [ref=e347]
        - button "Move card 49" [ref=e348]
    - listitem [ref=e349]:
      - heading "Card 50" [level=2] [ref=e350]
      - paragraph [ref=e351]: Card content
      - generic [ref=e352]:
        - button "Move up" [ref=e353]
        - button "Move down" [ref=e354]
        - button "Move card 50" [ref=e355]
    - listitem [ref=e356]:
      - heading "Card 51" [level=2] [ref=e357]
      - paragraph [ref=e358]: Card content Card content
      - generic [ref=e359]:
        - button "Move up" [ref=e360]
        - button "Move down" [ref=e361]
        - button "Move card 51" [ref=e362]
    - listitem [ref=e363]:
      - heading "Card 52" [level=2] [ref=e364]
      - paragraph [ref=e365]: Card content Card content Card content
      - generic [ref=e366]:
        - button "Move up" [ref=e367]
        - button "Move down" [ref=e368]
        - button "Move card 52" [ref=e369]
    - listitem [ref=e370]:
      - heading "Card 53" [level=2] [ref=e371]
      - paragraph [ref=e372]: Card content Card content Card content Card content
      - generic [ref=e373]:
        - button "Move up" [ref=e374]
        - button "Move down" [ref=e375]
        - button "Move card 53" [ref=e376]
    - listitem [ref=e377]:
      - heading "Card 54" [level=2] [ref=e378]
      - paragraph [ref=e379]: Card content Card content Card content Card content Card content
      - generic [ref=e380]:
        - button "Move up" [ref=e381]
        - button "Move down" [ref=e382]
        - button "Move card 54" [ref=e383]
    - listitem [ref=e384]:
      - heading "Card 55" [level=2] [ref=e385]
      - paragraph [ref=e386]: Card content Card content Card content Card content Card content Card content
      - generic [ref=e387]:
        - button "Move up" [ref=e388]
        - button "Move down" [ref=e389]
        - button "Move card 55" [ref=e390]
    - listitem [ref=e391]:
      - heading "Card 56" [level=2] [ref=e392]
      - paragraph [ref=e393]: Card content Card content Card content Card content Card content Card content Card content
      - generic [ref=e394]:
        - button "Move up" [ref=e395]
        - button "Move down" [ref=e396]
        - button "Move card 56" [ref=e397]
    - listitem [ref=e398]:
      - heading "Card 57" [level=2] [ref=e399]
      - paragraph [ref=e400]: Card content
      - generic [ref=e401]:
        - button "Move up" [ref=e402]
        - button "Move down" [ref=e403]
        - button "Move card 57" [ref=e404]
    - listitem [ref=e405]:
      - heading "Card 58" [level=2] [ref=e406]
      - paragraph [ref=e407]: Card content Card content
      - generic [ref=e408]:
        - button "Move up" [ref=e409]
        - button "Move down" [ref=e410]
        - button "Move card 58" [ref=e411]
    - listitem [ref=e412]:
      - heading "Card 59" [level=2] [ref=e413]
      - paragraph [ref=e414]: Card content Card content Card content
      - generic [ref=e415]:
        - button "Move up" [ref=e416]
        - button "Move down" [ref=e417]
        - button "Move card 59" [ref=e418]
    - listitem [ref=e419]:
      - heading "Card 60" [level=2] [ref=e420]
      - paragraph [ref=e421]: Card content Card content Card content Card content
      - generic [ref=e422]:
        - button "Move up" [ref=e423]
        - button "Move down" [ref=e424]
        - button "Move card 60" [ref=e425]
    - listitem [ref=e426]:
      - heading "Card 61" [level=2] [ref=e427]
      - paragraph [ref=e428]: Card content Card content Card content Card content Card content
      - generic [ref=e429]:
        - button "Move up" [ref=e430]
        - button "Move down" [ref=e431]
        - button "Move card 61" [ref=e432]
    - listitem [ref=e433]:
      - heading "Card 62" [level=2] [ref=e434]
      - paragraph [ref=e435]: Card content Card content Card content Card content Card content Card content
      - generic [ref=e436]:
        - button "Move up" [ref=e437]
        - button "Move down" [ref=e438]
        - button "Move card 62" [ref=e439]
    - listitem [ref=e440]:
      - heading "Card 63" [level=2] [ref=e441]
      - paragraph [ref=e442]: Card content Card content Card content Card content Card content Card content Card content
      - generic [ref=e443]:
        - button "Move up" [ref=e444]
        - button "Move down" [ref=e445]
        - button "Move card 63" [ref=e446]
    - listitem [ref=e447]:
      - heading "Card 64" [level=2] [ref=e448]
      - paragraph [ref=e449]: Card content
      - generic [ref=e450]:
        - button "Move up" [ref=e451]
        - button "Move down" [ref=e452]
        - button "Move card 64" [ref=e453]
    - listitem [ref=e454]:
      - heading "Card 65" [level=2] [ref=e455]
      - paragraph [ref=e456]: Card content Card content
      - generic [ref=e457]:
        - button "Move up" [ref=e458]
        - button "Move down" [ref=e459]
        - button "Move card 65" [ref=e460]
    - listitem [ref=e461]:
      - heading "Card 66" [level=2] [ref=e462]
      - paragraph [ref=e463]: Card content Card content Card content
      - generic [ref=e464]:
        - button "Move up" [ref=e465]
        - button "Move down" [ref=e466]
        - button "Move card 66" [ref=e467]
    - listitem [ref=e468]:
      - heading "Card 67" [level=2] [ref=e469]
      - paragraph [ref=e470]: Card content Card content Card content Card content
      - generic [ref=e471]:
        - button "Move up" [ref=e472]
        - button "Move down" [ref=e473]
        - button "Move card 67" [ref=e474]
    - listitem [ref=e475]:
      - heading "Card 68" [level=2] [ref=e476]
      - paragraph [ref=e477]: Card content Card content Card content Card content Card content
      - generic [ref=e478]:
        - button "Move up" [ref=e479]
        - button "Move down" [ref=e480]
        - button "Move card 68" [ref=e481]
    - listitem [ref=e482]:
      - heading "Card 69" [level=2] [ref=e483]
      - paragraph [ref=e484]: Card content Card content Card content Card content Card content Card content
      - generic [ref=e485]:
        - button "Move up" [ref=e486]
        - button "Move down" [ref=e487]
        - button "Move card 69" [ref=e488]
    - listitem [ref=e489]:
      - heading "Card 70" [level=2] [ref=e490]
      - paragraph [ref=e491]: Card content Card content Card content Card content Card content Card content Card content
      - generic [ref=e492]:
        - button "Move up" [ref=e493]
        - button "Move down" [ref=e494]
        - button "Move card 70" [ref=e495]
    - listitem [ref=e496]:
      - heading "Card 71" [level=2] [ref=e497]
      - paragraph [ref=e498]: Card content
      - generic [ref=e499]:
        - button "Move up" [ref=e500]
        - button "Move down" [ref=e501]
        - button "Move card 71" [ref=e502]
    - listitem [ref=e503]:
      - heading "Card 72" [level=2] [ref=e504]
      - paragraph [ref=e505]: Card content Card content
      - generic [ref=e506]:
        - button "Move up" [ref=e507]
        - button "Move down" [ref=e508]
        - button "Move card 72" [ref=e509]
    - listitem [ref=e510]:
      - heading "Card 73" [level=2] [ref=e511]
      - paragraph [ref=e512]: Card content Card content Card content
      - generic [ref=e513]:
        - button "Move up" [ref=e514]
        - button "Move down" [ref=e515]
        - button "Move card 73" [ref=e516]
    - listitem [ref=e517]:
      - heading "Card 74" [level=2] [ref=e518]
      - paragraph [ref=e519]: Card content Card content Card content Card content
      - generic [ref=e520]:
        - button "Move up" [ref=e521]
        - button "Move down" [ref=e522]
        - button "Move card 74" [ref=e523]
    - listitem [ref=e524]:
      - heading "Card 75" [level=2] [ref=e525]
      - paragraph [ref=e526]: Card content Card content Card content Card content Card content
      - generic [ref=e527]:
        - button "Move up" [ref=e528]
        - button "Move down" [ref=e529]
        - button "Move card 75" [ref=e530]
    - listitem [ref=e531]:
      - heading "Card 76" [level=2] [ref=e532]
      - paragraph [ref=e533]: Card content Card content Card content Card content Card content Card content
      - generic [ref=e534]:
        - button "Move up" [ref=e535]
        - button "Move down" [ref=e536]
        - button "Move card 76" [ref=e537]
    - listitem [ref=e538]:
      - heading "Card 77" [level=2] [ref=e539]
      - paragraph [ref=e540]: Card content Card content Card content Card content Card content Card content Card content
      - generic [ref=e541]:
        - button "Move up" [ref=e542]
        - button "Move down" [ref=e543]
        - button "Move card 77" [ref=e544]
    - listitem [ref=e545]:
      - heading "Card 78" [level=2] [ref=e546]
      - paragraph [ref=e547]: Card content
      - generic [ref=e548]:
        - button "Move up" [ref=e549]
        - button "Move down" [ref=e550]
        - button "Move card 78" [ref=e551]
    - listitem [ref=e552]:
      - heading "Card 79" [level=2] [ref=e553]
      - paragraph [ref=e554]: Card content Card content
      - generic [ref=e555]:
        - button "Move up" [ref=e556]
        - button "Move down" [ref=e557]
        - button "Move card 79" [ref=e558]
    - listitem [ref=e559]:
      - heading "Card 80" [level=2] [ref=e560]
      - paragraph [ref=e561]: Card content Card content Card content
      - generic [ref=e562]:
        - button "Move up" [ref=e563]
        - button "Move down" [disabled] [ref=e564]
        - button "Move card 80" [ref=e565]
```

# Test source

```ts
  1  | import {test,expect} from '@playwright/test';
  2  | const board=page=>page.getByRole('list',{name:'Board'});
  3  | const card=(page,id)=>board(page).locator('[data-card-id="'+id+'"]');
  4  | const ids=page=>board(page).locator('[data-card-id]').evaluateAll(nodes=>nodes.map(n=>n.dataset.cardId));
  5  | test.beforeEach(async({page})=>{await page.route('**/api/order',r=>r.fulfill({json:{ok:true}}));});
  6  | test('button reorder preserves identity, focus, intermediate movement and repeated interaction',async({page})=>{
  7  |  await page.goto('/');await expect(board(page).getByRole('listitem')).toHaveCount(80);
  8  |  const old=await card(page,'1').boundingBox();
  9  |  await card(page,'1').getByRole('button',{name:'Move down',exact:true}).focus();
  10 |  await page.keyboard.press('Enter');
  11 |  await expect.poll(async()=>(await ids(page)).slice(0,2)).toEqual(['2','1']);
  12 |  await expect(card(page,'1').getByRole('button',{name:'Move down',exact:true})).toBeFocused();
  13 |  const during=await card(page,'1').boundingBox();
  14 |  await page.waitForTimeout(550);const end=await card(page,'1').boundingBox();
  15 |  expect(Math.hypot(end.x-old.x,end.y-old.y)).toBeGreaterThan(20);
  16 |  expect(Math.hypot(end.x-during.x,end.y-during.y)).toBeGreaterThan(1);
  17 |  await card(page,'1').getByRole('button',{name:'Move down',exact:true}).focus();
  18 |  await page.keyboard.press('Enter');const before=await card(page,'1').boundingBox();
  19 |  await page.keyboard.press('Enter');const after=await card(page,'1').boundingBox();
  20 |  expect(Math.hypot(before.x-after.x,before.y-after.y)).toBeLessThan(90);
  21 |  await expect.poll(async()=>(await ids(page)).slice(0,4)).toEqual(['2','3','4','1']);
  22 |  await page.waitForTimeout(550);await expect(card(page,'1').getByRole('button',{name:'Move down',exact:true})).toBeFocused();
  23 | });
  24 | test('pointer drag and buttons produce the same business order',async({page})=>{
  25 |  await page.goto('/');const handle=await card(page,'1').getByRole('button',{name:'Move card 1',exact:true}).boundingBox();const target=await card(page,'3').boundingBox();
  26 |  await page.mouse.move(handle.x+handle.width/2,handle.y+handle.height/2);await page.mouse.down();
  27 |  await page.mouse.move(target.x+target.width/2,target.y+target.height/2,{steps:8});await page.mouse.up();
> 28 |  await expect.poll(async()=>(await ids(page)).slice(0,3)).toEqual(['2','3','1']);
     |                                                           ^ Error: expect(received).toEqual(expected) // deep equality
  29 | });
  30 | test('new intent survives save ordering, rejection and retry',async({page})=>{
  31 |  const pending=[];await page.unroute('**/api/order');await page.route('**/api/order',r=>pending.push(r));await page.goto('/');
  32 |  await card(page,'1').getByRole('button',{name:'Move down',exact:true}).click();
  33 |  await expect.poll(()=>pending.length).toBe(1);
  34 |  await card(page,'1').getByRole('button',{name:'Move down',exact:true}).click();
  35 |  // Serialized or concurrent requests are both valid; the last acknowledged save must be current.
  36 |  await pending[0].fulfill({json:{ok:true}});await expect.poll(()=>pending.length).toBe(2);
  37 |  const newest=pending[1].request().postDataJSON().ids;expect(newest.slice(0,3)).toEqual(['2','3','1']);
  38 |  await pending[1].fulfill({status:500,body:'unavailable'});await expect(page.getByRole('alert')).toContainText(/save|failed|unavailable/i);
  39 |  await page.getByRole('button',{name:'Retry save',exact:true}).click();await expect.poll(()=>pending.length).toBe(3);
  40 |  expect(pending[2].request().postDataJSON().ids).toEqual(newest);await pending[2].fulfill({json:{ok:true}});
  41 |  await expect(page.getByRole('status')).toContainText(/saved/i);expect((await ids(page)).slice(0,3)).toEqual(['2','3','1']);
  42 | });
  43 | test('scroll, resize and disposal retain a settled board with no ghost work',async({page})=>{
  44 |  await page.goto('/');await card(page,'1').getByRole('button',{name:'Move down',exact:true}).click();
  45 |  await page.setViewportSize({width:740,height:600});await page.evaluate(()=>window.scrollTo(0,300));
  46 |  await page.waitForTimeout(600);expect((await ids(page)).slice(0,2)).toEqual(['2','1']);
  47 |  await page.getByRole('button',{name:'Hide board',exact:true}).click();await expect(board(page)).toHaveCount(0);await page.waitForTimeout(600);
  48 |  expect(await page.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running').length)).toBe(0);
  49 |  await expect(board(page)).toHaveCount(0);await page.getByRole('button',{name:'Show board',exact:true}).click();
  50 |  await expect(board(page).getByRole('listitem')).toHaveCount(80);expect((await ids(page)).slice(0,2)).toEqual(['2','1']);
  51 | });
  52 | test('reduced motion gives the correct static result',async({page})=>{
  53 |  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');await card(page,'1').getByRole('button',{name:'Move down',exact:true}).click();
  54 |  expect((await ids(page)).slice(0,2)).toEqual(['2','1']);expect(await page.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running').length)).toBe(0);
  55 | });
  56 | 
```