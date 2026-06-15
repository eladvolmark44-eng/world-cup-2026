export const ADMIN_UID = "8tDgIRJQDFZyiTvaR0pP8nXShgH2";
export const YELLOW_CARD_UID = "18QvfShudxTTsPfUJPpLhEQNp3h1";

export const MONKEY_BOT_UID = "monkey-bot-amir";
export const MONKEY_BOT_PHOTO = "/monkey.jpg";
export const MONKEY_BOT_BETS = {"matches":{"A1":{"home":1,"away":0},"A2":{"home":1,"away":1},"B1":{"home":2,"away":1},"D1":{"home":2,"away":0},"B2":{"home":2,"away":0},"C1":{"home":2,"away":1},"C2":{"home":2,"away":0},"D2":{"home":2,"away":2},"E1":{"home":2,"away":1},"F1":{"home":1,"away":0},"E2":{"home":2,"away":1},"F2":{"home":1,"away":0},"H1":{"home":1,"away":0},"G1":{"home":1,"away":0},"H2":{"home":2,"away":0},"G2":{"home":2,"away":0},"I1":{"home":2,"away":1},"I2":{"home":0,"away":2},"J1":{"home":1,"away":0},"J2":{"home":2,"away":0},"K1":{"home":1,"away":1},"L1":{"home":0,"away":2},"L2":{"home":1,"away":0},"K2":{"home":1,"away":1},"A3":{"home":1,"away":0},"B3":{"home":1,"away":0},"B4":{"home":2,"away":2},"A4":{"home":1,"away":1},"D3":{"home":1,"away":2},"C3":{"home":0,"away":0},"C4":{"home":2,"away":0},"D4":{"home":0,"away":1},"F3":{"home":2,"away":0},"E3":{"home":1,"away":0},"E4":{"home":1,"away":0},"F4":{"home":1,"away":2},"H3":{"home":2,"away":1},"G3":{"home":1,"away":1},"H4":{"home":1,"away":2},"G4":{"home":0,"away":0},"J3":{"home":2,"away":0},"I3":{"home":1,"away":1},"I4":{"home":0,"away":2},"J4":{"home":2,"away":2},"K3":{"home":2,"away":1},"L3":{"home":1,"away":0},"L4":{"home":0,"away":2},"K4":{"home":1,"away":0},"B5":{"home":2,"away":1},"B6":{"home":0,"away":0},"C5":{"home":0,"away":1},"C6":{"home":2,"away":0},"A5":{"home":2,"away":1},"A6":{"home":2,"away":0},"E5":{"home":2,"away":1},"E6":{"home":2,"away":1},"F5":{"home":0,"away":2},"F6":{"home":0,"away":1},"D5":{"home":1,"away":0},"D6":{"home":1,"away":0},"I5":{"home":2,"away":0},"I6":{"home":1,"away":2},"H5":{"home":2,"away":2},"H6":{"home":1,"away":1},"G5":{"home":0,"away":2},"G6":{"home":0,"away":2},"L5":{"home":2,"away":0},"L6":{"home":2,"away":1},"K5":{"home":1,"away":2},"K6":{"home":1,"away":0},"J5":{"home":2,"away":1},"J6":{"home":0,"away":1}},"groups":{"A":["קוריאה","צ'כיה"],"B":["שוויץ","קנדה"],"C":["ברזיל","מרוקו"],"D":["ארה\"ב","טורקיה"],"E":["גרמניה","אקוודור"],"F":["הולנד","שוודיה"],"G":["בלגיה","מצרים"],"H":["ספרד","אורוגוואי"],"I":["צרפת","נורווגיה"],"J":["ארגנטינה","אוסטריה"],"K":["פורטוגל","קולומביה"],"L":["אנגליה","קרואטיה"]},"champion":"ספרד","goldenBoot":"ויניסיוס ג'וניור","totalGoals":123};
export const MONKEY_BOT = {
  uid: MONKEY_BOT_UID,
  name: "הקוף של אמיר",
  photoURL: MONKEY_BOT_PHOTO,
  bets: MONKEY_BOT_BETS,
  isBot: true,
};

// ── Preset bets for known players (applied on first sign-in by name match) ────
export const PRESET_BETS_BY_NAME = {
  "ארקדי": {
    groups: {
      A:["מקסיקו","מקסיקו"],
      B:["קנדה","שוויץ"],
      C:["ברזיל","מרוקו"],
      D:['ארה"ב',"טורקיה"],
      E:["גרמניה","חוף השנהב"],
      F:["הולנד","יפן"],
      G:["בלגיה","מצרים"],
      H:["ספרד","אורוגוואי"],
      I:["צרפת","נורווגיה"],
      J:["ארגנטינה","אוסטריה"],
      K:["פורטוגל","קולומביה"],
      L:["אנגליה","קרואטיה"],
    }
  },
};
