// Top strikers / goal threats for World Cup 2026
export const STRIKERS = [
  "קיליאן אמבפה",
  "הארי קיין",
  "ליונל מסי",
  "ארלינג האלנד",
  "למין יאמאל",
  "כריסטיאנו רונאלדו",
  "ניק וולטמאדה",
  "עוסמאן דמבלה",
  "לאוטרו מרטינז",
  "ויניסיוס ג'וניור",
  "בוקאיו סאקה",
  "ראפיניה",
  "מיקל אויארסבאל",
];

export const STRIKER_FLAGS = {
  "קיליאן אמבפה":       "🇫🇷",
  "הארי קיין":          "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  "ליונל מסי":          "🇦🇷",
  "ארלינג האלנד":       "🇳🇴",
  "למין יאמאל":         "🇪🇸",
  "כריסטיאנו רונאלדו":  "🇵🇹",
  "ניק וולטמאדה":       "🇩🇪",
  "עוסמאן דמבלה":       "🇫🇷",
  "לאוטרו מרטינז":      "🇦🇷",
  "ויניסיוס ג'וניור":   "🇧🇷",
  "בוקאיו סאקה":        "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  "ראפיניה":            "🇧🇷",
  "מיקל אויארסבאל":     "🇪🇸",
};

// Maps STRIKERS Hebrew names → possible English API name variants (football-data.org / API-Football)
export const STRIKER_API_NAMES = {
  "קיליאן אמבפה":      ["Kylian Mbappé","Kylian Mbappe","K. Mbappé","K. Mbappe"],
  "הארי קיין":         ["Harry Kane","H. Kane"],
  "ליונל מסי":         ["Lionel Messi","L. Messi"],
  "ארלינג האלנד":      ["Erling Haaland","E. Haaland"],
  "למין יאמאל":        ["Lamine Yamal","L. Yamal"],
  "כריסטיאנו רונאלדו": ["Cristiano Ronaldo","C. Ronaldo"],
  "ניק וולטמאדה":      ["Nick Woltemade","N. Woltemade","Niclas Woltemade"],
  "עוסמאן דמבלה":      ["Ousmane Dembélé","Ousmane Dembele","O. Dembélé","O. Dembele"],
  "לאוטרו מרטינז":     ["Lautaro Martínez","Lautaro Martinez","L. Martínez","L. Martinez"],
  "ויניסיוס ג'וניור":  ["Vinícius Júnior","Vinicius Junior","V. Júnior","V. Junior","Vinícius Jr."],
  "בוקאיו סאקה":       ["Bukayo Saka","B. Saka"],
  "ראפיניה":           ["Raphinha","R. Raphinha"],
  "מיקל אויארסבאל":    ["Mikel Oyarzabal","M. Oyarzabal"],
};

export const PLAYER_HEB={
  // France
  "Kylian Mbappé":"קיליאן אמבפה","Kylian Mbappe":"קיליאן אמבפה",
  "Antoine Griezmann":"אנטואן גריזמן","Ousmane Dembélé":"עוסמאן דמבלה","Ousmane Dembele":"עוסמאן דמבלה",
  "Marcus Thuram":"מרקוס תורם","Aurélien Tchouaméni":"אורליאן צ'ואמני","Aurelien Tchouameni":"אורליאן צ'ואמני",
  "Eduardo Camavinga":"אדוארדו קמאווינגה","Adrien Rabiot":"אדריאן ראביו","Mike Maignan":"מייק מניאן",
  "William Saliba":"ויליאם סאליבה","Dayot Upamecano":"דאיו אופמקאנו","Theo Hernandez":"תיאו הרנאנדס",
  "Théo Hernandez":"תיאו הרנאנדס","Jules Kounde":"ז'ול קונדה","Jules Koundé":"ז'ול קונדה",
  "Randal Kolo Muani":"ראנדאל קולו מואני","Bradley Barcola":"בראדלי בארקולה",
  // Spain
  "Lamine Yamal":"למין יאמאל","Pedri":"פדרי","Gavi":"גאווי","Rodri":"רודרי",
  "Dani Olmo":"דני אולמו","Mikel Oyarzabal":"מיקל אויארסבאל","Ferran Torres":"פראן טורס",
  "Nico Williams":"ניקו וויליאמס","Alejandro Balde":"אלחנדרו בלדה","Álvaro Morata":"אלוארו מוראטה",
  "Alvaro Morata":"אלוארו מוראטה","Unai Simon":"אונאי סימון","Unai Simón":"אונאי סימון",
  "David Raya":"דוויד ראיה","Fabian Ruiz":"פביאן רואיס","Fabián Ruiz":"פביאן רואיס",
  "Marc Cucurella":"מארק קוקורייה","Dani Carvajal":"דני קארוואחאל","Aymeric Laporte":"איימריק לאפורט",
  "Robin Le Normand":"רובן לה נורמאן","Martin Zubimendi":"מרטין זוביממדי",
  // England
  "Harry Kane":"הארי קיין","Jude Bellingham":"ג'וד בלינגהם","Bukayo Saka":"בוקאיו סאקה",
  "Phil Foden":"פיל פודן","Declan Rice":"דקלן רייס","Jordan Pickford":"ג'ורדן פיקפורד",
  "Trent Alexander-Arnold":"טרנט אלכסנדר-ארנולד","John Stones":"ג'ון סטונס",
  "Marc Guehi":"מארק גאהי","Kieran Trippier":"קיירן טריפייר","Marcus Rashford":"מרקוס ראשפורד",
  "Cole Palmer":"קול פאלמר","Ollie Watkins":"אולי ווטקינס","Anthony Gordon":"אנתוני גורדון",
  "Kobbie Mainoo":"קובי מיינו","Luke Shaw":"לוק שאו","Conor Gallagher":"קונור גאלאגר",
  // Argentina
  "Lionel Messi":"ליאונל מסי","Lautaro Martínez":"לאוטרו מרטינז","Lautaro Martinez":"לאוטרו מרטינז",
  "Ángel Di María":"אנחל די מריה","Angel Di Maria":"אנחל די מריה","Rodrigo De Paul":"רודריגו דה פאול",
  "Alexis Mac Allister":"אלכסיס מאק אליסטר","Emiliano Martínez":"אמיליאנו מרטינז",
  "Emiliano Martinez":"אמיליאנו מרטינז","Julián Álvarez":"חוליאן אלבארז","Julian Alvarez":"חוליאן אלבארז",
  "Cristian Romero":"כריסטיאן רומרו","Lisandro Martínez":"ליסנדרו מרטינז",
  "Lisandro Martinez":"ליסנדרו מרטינז","Paulo Dybala":"פאולו דיבלה","Leandro Paredes":"לאנדרו פארדס",
  "Giovani Lo Celso":"ג'יובאני לו צ'לסו","Nicolás Tagliafico":"ניקולאס טאליאפיקו",
  // Brazil
  "Vinícius Júnior":"וויניסיוס ג'וניור","Vinicius Junior":"וויניסיוס ג'וניור","Raphinha":"ראפיניה",
  "Rodrygo":"רודריגו","Neymar":"ניימאר","Alisson":"אליסון","Marquinhos":"מרקיניוס",
  "Casemiro":"קאסמירו","Bruno Guimarães":"ברונו גימאראיש","Bruno Guimaraes":"ברונו גימאראיש",
  "Antony":"אנטוני","Gabriel Martinelli":"גבריאל מרטינלי","Endrick":"אנדריק","Pedro":"פדרו",
  "Richarlison":"ריצ'רליסון","Éder Militão":"אדר מיליטאו","Eder Militao":"אדר מיליטאו",
  // Portugal
  "Cristiano Ronaldo":"כריסטיאנו רונאלדו","Bruno Fernandes":"ברונו פרננדס",
  "Bernardo Silva":"ברנרדו סילבה","Rúben Dias":"רובן דיאש","Ruben Dias":"רובן דיאש",
  "João Félix":"ז'ואו פליקס","Joao Felix":"ז'ואו פליקס","Diogo Jota":"דיאוגו ז'וטה",
  "Rafael Leão":"ראפאל לאאו","Rafael Leao":"ראפאל לאאו","Pepe":"פאפה",
  "Rui Patrício":"רוי פטרישיו","Rui Patricio":"רוי פטרישיו","Vitinha":"ויטיניה",
  "Gonçalo Ramos":"גונסאלו ראמוס","Goncalo Ramos":"גונסאלו ראמוס",
  "João Cancelo":"ז'ואו קנסלו","Joao Cancelo":"ז'ואו קנסלו",
  // Germany
  "Florian Wirtz":"פלוריאן וירץ","Jamal Musiala":"ג'מאל מוסיאלה","Leroy Sané":"לרוי זאנה",
  "Leroy Sane":"לרוי זאנה","Thomas Müller":"תומאס מולר","Thomas Muller":"תומאס מולר",
  "Manuel Neuer":"מנואל נויאר","Joshua Kimmich":"יושוע קימיך","Kai Havertz":"קאי האברץ",
  "Serge Gnabry":"זרז' גנאברי","Antonio Rüdiger":"אנטוניו רודיגר","Antonio Rudiger":"אנטוניו רודיגר",
  "Leon Goretzka":"ליאון גורצקה","Ilkay Gündogan":"אילקאי גונדואן","Ilkay Gundogan":"אילקאי גונדואן",
  "Niklas Süle":"ניקלס סולה","Niklas Sule":"ניקלס סולה",
  "Nick Woltemade":"ניק וולטמאדה","Niclas Woltemade":"ניק וולטמאדה",
  // Netherlands
  "Virgil van Dijk":"וירחיל ואן דייק","Memphis Depay":"ממפיס דפאי","Cody Gakpo":"קודי גאקפו",
  "Xavi Simons":"חאווי סימונס","Frenkie de Jong":"פרנקי דה יונג",
  "Denzel Dumfries":"דנזל דמפריס","Nathan Aké":"נייתן אקה","Nathan Ake":"נייתן אקה",
  "Stefan de Vrij":"סטפן דה וריי","Wout Weghorst":"ווט ווגהורסט",
  // Norway
  "Erling Haaland":"ארלינג האלנד","Martin Ødegaard":"מרטין אודגור","Martin Odegaard":"מרטין אודגור",
  "Alexander Sørloth":"אלכסנדר סורלות","Alexander Sorloth":"אלכסנדר סורלות",
  // Belgium
  "Kevin De Bruyne":"קווין דה ברויינה","Romelu Lukaku":"רומלו לוקאקו",
  "Thibaut Courtois":"טיבו קורטואה","Jeremy Doku":"ג'רמי דוקו","Axel Witsel":"אקסל ויצל",
  "Jan Vertonghen":"יאן ורטונגן","Leandro Trossard":"לאנדרו טרוסאר",
  // Morocco
  "Hakim Ziyech":"חכים זייח","Achraf Hakimi":"אשרף חקימי","Yassine Bounou":"יאסין בונו",
  "Sofyan Amrabat":"סופיאן אמראבט","Riyad Mahrez":"ריאד מהרז",
  // Senegal
  "Sadio Mané":"סאדיו מאנה","Sadio Mane":"סאדיו מאנה","Édouard Mendy":"אדוארד מנדי",
  "Edouard Mendy":"אדוארד מנדי","Kalidou Koulibaly":"קאלידו קוליבלי",
  "Ismaïla Sarr":"ישמעיל סאר","Ismaila Sarr":"ישמעיל סאר",
  // USA
  "Christian Pulisic":"כריסטיאן פוליסיץ'","Tyler Adams":"טיילר אדמס",
  "Weston McKennie":"ווסטון מקני","Giovanni Reyna":"ג'יובאני ריינה","Gio Reyna":"ג'יו ריינה",
  "Josh Sargent":"ג'וש סרג'נט","Antonee Robinson":"אנטוני רובינסון","Matt Turner":"מאט טרנר",
  "Sergiño Dest":"סרג'ינו דסט","Sergino Dest":"סרג'ינו דסט","Tim Weah":"טים וי",
  "Folarin Balogun":"פולרין באלוגון","Ricardo Pepi":"ריקרדו פפי",
  // Mexico
  "Hirving Lozano":"הירוינג לוסאנו","Raúl Jiménez":"ראול חימנז","Raul Jimenez":"ראול חימנז",
  "Guillermo Ochoa":"גיירמו אוצ'ואה","Edson Álvarez":"אדסון אלוארז","Edson Alvarez":"אדסון אלוארז",
  "Santiago Giménez":"סנטיאגו חימנז","Santiago Gimenez":"סנטיאגו חימנז",
  // Japan
  "Takumi Minamino":"טאקומי מינאמינו","Daichi Kamada":"דאיצ'י קמאדה","Ritsu Doan":"ריצו דואן",
  "Kaoru Mitoma":"קאורו מיטומה","Shuichi Gonda":"שואיצ'י גונדה",
  "Wataru Endo":"ווטארו אנדו","Takehiro Tomiyasu":"טאקהירו טומיאסו","Junya Ito":"ג'וניה איטו",
  // South Korea
  "Son Heung-min":"סון הה-מין","Son Heung Min":"סון הה-מין","Hwang Hee-chan":"הואנג הי-צ'אן",
  "Kim Min-jae":"קים מין-ג'ה","Lee Kang-in":"לי קאנג-אין",
  // Croatia
  "Luka Modrić":"לוקה מודריץ'","Luka Modric":"לוקה מודריץ'","Ivan Perišić":"אייבן פריסיץ'",
  "Ivan Perisic":"אייבן פריסיץ'","Mateo Kovačić":"מאטאו קובאצ'יץ'","Mateo Kovacic":"מאטאו קובאצ'יץ'",
  "Joško Gvardiol":"יושקו גוורדיול","Josko Gvardiol":"יושקו גוורדיול",
  "Dominik Livaković":"דומיניק ליוואקוביץ'","Dominik Livakovic":"דומיניק ליוואקוביץ'",
  "Andrej Kramarić":"אנדריי קרמריץ'","Andrej Kramaric":"אנדריי קרמריץ'",
  // Austria
  "Marcel Sabitzer":"מרסל זאביצר","David Alaba":"דוויד אלאבה",
  "Marko Arnautović":"מרקו ארנאוטוביץ'","Marko Arnautovic":"מרקו ארנאוטוביץ'",
  "Christoph Baumgartner":"כריסטוף באומגרטנר",
  // Uruguay
  "Luis Suárez":"לואיס סוארס","Luis Suarez":"לואיס סוארס","Federico Valverde":"פדריקו ואלווארדה",
  "Darwin Núñez":"דארווין נוניז","Darwin Nunez":"דארווין נוניז",
  "Ronald Araújo":"רונאלד אראוחו","Ronald Araujo":"רונאלד אראוחו",
  // Colombia
  "James Rodríguez":"חיימס רודריגז","James Rodriguez":"חיימס רודריגז",
  "Luis Díaz":"לואיס דיאז","Luis Diaz":"לואיס דיאז","Radamel Falcao":"ראדאמל פלקאו",
  "David Ospina":"דוויד אוספינה",
  // Switzerland
  "Granit Xhaka":"גראניט ז'אקה","Xherdan Shaqiri":"ז'רדן שקירי","Yann Sommer":"יאן זומר",
  "Manuel Akanji":"מנואל אקאנג'י","Breel Embolo":"ברל אמבולו","Remo Freuler":"ריאמו פרוילר",
  "Denis Zakaria":"דניס זכריה","Gregor Kobel":"גרגור קובל","Silvan Widmer":"זילוון וידמר",
  "Nico Elvedi":"ניקו אלווידי","Fabian Schär":"פביאן שאר","Fabian Schar":"פביאן שאר",
  "Ruben Vargas":"רובן ורגס","Michel Aebischer":"מישל אביישר",
  // Canada
  "Alphonso Davies":"אלפונסו דייויס","Jonathan David":"ג'ונתן דיוויד","Cyle Larin":"סייל לרין",
  "Tajon Buchanan":"טייג'ון בוקהנן","Atiba Hutchinson":"אטיבה האצ'ינסון","Milan Borjan":"מילאן בורג'אן",
  "Kamal Miller":"קמאל מילר","Alistair Johnston":"אליסטייר ג'ונסטון",
  // Qatar
  "Akram Afif":"אקרם עפיף","Hassan Al-Haydos":"חסן אל-היידוס","Almoez Ali":"אלמועז עלי",
  "Meshaal Barsham":"מישאל בארשאם",
  // Ecuador
  "Enner Valencia":"אנר וולנסיה","Moisés Caicedo":"מואיסס קאיסדו","Moises Caicedo":"מואיסס קאיסדו",
  "Gonzalo Plata":"גונסאלו פלאטה","Piero Hincapié":"פיארו הינקאפיה","Piero Hincapie":"פיארו הינקאפיה",
  // Czech Republic
  "Tomáš Souček":"תומאש סוצ'ק","Tomas Soucek":"תומאש סוצ'ק","Patrik Schick":"פטריק שיק",
  "Alex Kral":"אלקס קראל","Adam Hložek":"אדם הלוז'ק","Adam Hlozek":"אדם הלוז'ק",
  // Bosnia
  "Edin Džeko":"עדין ז'קו","Edin Dzeko":"עדין ז'קו",
  "Miralem Pjanić":"מיראלם פיאניץ'","Miralem Pjanic":"מיראלם פיאניץ'",
  "Sead Kolašinac":"סאד קולאשינץ'","Sead Kolasinac":"סאד קולאשינץ'",
  // Scotland
  "Scott McTominay":"סקוט מקטומיניי","Andrew Robertson":"אנדרו רוברטסון",
  "John McGinn":"ג'ון מקגין","Lyndon Dykes":"לינדון דייקס","Angus Gunn":"אנגוס גאן",
  // Sweden
  "Victor Lindelöf":"ויקטור לינדלוף","Victor Lindelof":"ויקטור לינדלוף",
  "Dejan Kulusevski":"דיאן קולוסבסקי","Viktor Gyökeres":"ויקטור גיוקרש","Viktor Gyokeres":"ויקטור גיוקרש",
  "Emil Forsberg":"אמיל פורסברג","Alexander Isak":"אלכסנדר יזאק",
  // Turkey
  "Hakan Çalhanoğlu":"האקן קאלהאנוגלו","Hakan Calhanoglu":"האקן קאלהאנוגלו",
  "Kenan Yıldız":"קנאן יילדיז","Kenan Yildiz":"קנאן יילדיז",
  "Arda Güler":"ארדא גולר","Arda Guler":"ארדא גולר",
  "Cengiz Ünder":"ג'נגיז אונדר","Cengiz Under":"ג'נגיז אונדר","Merih Demiral":"מריח דמיראל",
  // Egypt
  "Mohamed Salah":"מוחמד סאלח","Omar Marmoush":"עומר מרמוש","Mohamed Elneny":"מוחמד אל-נני",
  // Iran
  "Mehdi Taremi":"מהדי תרמי","Sardar Azmoun":"סרדר אזמון","Ali Gholizadeh":"עלי ג'ולי-זאדה",
  // Saudi Arabia
  "Salem Al-Dawsari":"סאלם אל-דוסרי","Mohammed Al-Owais":"מוחמד אל-אוויס",
  "Saleh Al-Shehri":"סאלח אל-שהרי",
  // Ghana
  "Andre Ayew":"אנדרה איו","Jordan Ayew":"ג'ורדן איו",
  "Thomas Partey":"תומאס פארטי","Mohammed Kudus":"מוחמד קודוס",
  // Australia
  "Mat Ryan":"מאט ריאן","Mathew Leckie":"מתיו לקי","Mitchell Duke":"מיטשל דוק","Aaron Mooy":"אהרון מוי",
  // South Africa
  "Percy Tau":"פרסי טאו","Themba Zwane":"תמבה זוואנה","Ronwen Williams":"רונוון וויליאמס",
  // Paraguay
  "Miguel Almirón":"מיגל אלמירון","Miguel Almiron":"מיגל אלמירון",
  // Ivory Coast
  "Sébastien Haller":"סבסטיאן האלר","Sebastien Haller":"סבסטיאן האלר",
  "Franck Kessié":"פראנק קסיה","Franck Kessie":"פראנק קסיה","Simon Adingra":"סימון אדינגרה",
  "Nicolas Pépé":"ניקולס פפה","Nicolas Pepe":"ניקולס פפה",
  // Algeria
  "Riyad Mahrez":"ריאד מהרז","Islam Slimani":"אסלאם סלימאני",
  "Ismaël Bennacer":"ישמאיל בנאצר","Ismael Bennacer":"ישמאיל בנאצר",
  "Saïd Benrahma":"סאיד בן-ראחמה","Said Benrahma":"סאיד בן-ראחמה",
  // New Zealand
  "Chris Wood":"כריס וד","Clayton Lewis":"קלייטון לואיס",
};
