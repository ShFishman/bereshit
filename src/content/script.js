// script.js — the complete narrative content for Bereshit (Genesis 1–3).
// Pure data. No logic. The engine reads these keys.
//
// Conventions:
//   - Verses are the Masoretic text with nikud. The divine name is written ה׳
//     (the customary on-screen substitution). Swap for the full name if desired.
//   - `ref` follows Hebrew style: "בראשית א׳:ג׳".
//   - `dwell` is milliseconds to hold a narration line on screen.
//   - Narration is deliberately NOT scripture: present tense, plain, modern Hebrew.

export const SCRIPT = Object.freeze({
  meta: {
    title: { he: "בְּרֵאשִׁית", en: "In the Beginning" },
    subtitle: { he: "שבעה ימים. גן אחד. שער סגור.", en: "Seven days. One garden. A closed gate." },
    byline: { he: "על פי בראשית א׳–ג׳", en: "After Genesis 1–3" }
  },

  // ───────────────────────────────────────────────────────────────────────────
  // ACT 0 — TOHU
  // ───────────────────────────────────────────────────────────────────────────
  tohu: {
    verses: [
      {
        ref: "בראשית א׳:א׳",
        he: "בְּרֵאשִׁית בָּרָא אֱלֹהִים אֵת הַשָּׁמַיִם וְאֵת הָאָרֶץ׃",
        en: "In the beginning God created the heavens and the earth."
      },
      {
        ref: "בראשית א׳:ב׳",
        he: "וְהָאָרֶץ הָיְתָה תֹהוּ וָבֹהוּ וְחֹשֶׁךְ עַל־פְּנֵי תְהוֹם וְרוּחַ אֱלֹהִים מְרַחֶפֶת עַל־פְּנֵי הַמָּיִם׃",
        en: "And the earth was welter and waste, and darkness was upon the face of the deep, and the spirit of God hovered over the face of the waters."
      }
    ],
    narration: [
      { he: "לפני המילה הראשונה אין כלום. גם לא חושך. חושך הוא כבר משהו.", en: "Before the first word there is nothing. Not even dark. Dark is already something.", dwell: 4400 },
      { he: "מים שאין להם חוף. תהום שאין לה קרקעית.", en: "Water with no shore. A deep with no floor.", dwell: 3600 },
      { he: "משהו מרחף על פני המים. לא נוגע. עדיין לא.", en: "Something hovers over the face of the water. Not touching. Not yet.", dwell: 4200 },
      { he: "תקשיב. זה הרגע שלפני.", en: "Listen. This is the moment before.", dwell: 4000 }
    ],
    prompt: { he: "לחץ כדי לשמוע את המילה הראשונה", en: "Press to hear the first word" }
  },

  // ───────────────────────────────────────────────────────────────────────────
  // ACT 1 — CREATION
  // ───────────────────────────────────────────────────────────────────────────
  creation: {
    days: [
      {
        n: 1,
        name: { he: "יוֹם אֶחָד", en: "Day One" },
        epithet: { he: "הָאוֹר", en: "Light" },
        utterance: { he: "יְהִי אוֹר", en: "Let there be light" },
        verses: [
          {
            ref: "בראשית א׳:ג׳",
            he: "וַיֹּאמֶר אֱלֹהִים יְהִי אוֹר וַיְהִי־אוֹר׃",
            en: "And God said, Let there be light. And there was light."
          },
          {
            ref: "בראשית א׳:ד׳",
            he: "וַיַּרְא אֱלֹהִים אֶת־הָאוֹר כִּי־טוֹב וַיַּבְדֵּל אֱלֹהִים בֵּין הָאוֹר וּבֵין הַחֹשֶׁךְ׃",
            en: "And God saw the light, that it was good, and God divided the light from the darkness."
          },
          {
            ref: "בראשית א׳:ה׳",
            he: "וַיִּקְרָא אֱלֹהִים לָאוֹר יוֹם וְלַחֹשֶׁךְ קָרָא לָיְלָה וַיְהִי־עֶרֶב וַיְהִי־בֹקֶר יוֹם אֶחָד׃",
            en: "And God called the light Day, and the darkness he called Night. And there was evening and there was morning, one day."
          }
        ],
        narration: [
          { he: "אין שמש. אין עדיין מה שיאיר. ובכל זאת — אור.", en: "There is no sun. Nothing yet to shine. And still — light.", dwell: 4000 },
          { he: "האור לא מגרש את החושך. הוא רק נותן לו גבול.", en: "The light does not drive out the dark. It only gives it an edge.", dwell: 4000 },
          { he: "יום. לילה. הדברים הראשונים שנקראו בשם.", en: "Day. Night. The first things to be called by a name.", dwell: 3600 },
          { he: "שים לב: הערב בא קודם.", en: "Notice: the evening comes first.", dwell: 3800 }
        ],
        afterword: { he: "וַיְהִי־עֶרֶב וַיְהִי־בֹקֶר יוֹם אֶחָד", en: "And there was evening and there was morning, one day." }
      },
      {
        n: 2,
        name: { he: "יוֹם שֵׁנִי", en: "The Second Day" },
        epithet: { he: "הָרָקִיעַ", en: "The Firmament" },
        utterance: { he: "יְהִי רָקִיעַ בְּתוֹךְ הַמָּיִם", en: "Let there be a firmament in the midst of the waters" },
        verses: [
          {
            ref: "בראשית א׳:ו׳",
            he: "וַיֹּאמֶר אֱלֹהִים יְהִי רָקִיעַ בְּתוֹךְ הַמָּיִם וִיהִי מַבְדִּיל בֵּין מַיִם לָמָיִם׃",
            en: "And God said, Let there be a firmament in the midst of the waters, and let it divide the waters from the waters."
          },
          {
            ref: "בראשית א׳:ז׳",
            he: "וַיַּעַשׂ אֱלֹהִים אֶת־הָרָקִיעַ וַיַּבְדֵּל בֵּין הַמַּיִם אֲשֶׁר מִתַּחַת לָרָקִיעַ וּבֵין הַמַּיִם אֲשֶׁר מֵעַל לָרָקִיעַ וַיְהִי־כֵן׃",
            en: "And God made the firmament, and divided the waters which were under the firmament from the waters which were above the firmament. And it was so."
          },
          {
            ref: "בראשית א׳:ח׳",
            he: "וַיִּקְרָא אֱלֹהִים לָרָקִיעַ שָׁמָיִם וַיְהִי־עֶרֶב וַיְהִי־בֹקֶר יוֹם שֵׁנִי׃",
            en: "And God called the firmament Heaven. And there was evening and there was morning, a second day."
          }
        ],
        narration: [
          { he: "המים נחצים. חצי למעלה, חצי למטה. ביניהם — רווח.", en: "The waters are split. Half above, half below. Between them — a space.", dwell: 4000 },
          { he: "זה היום היחיד שלא נאמר בו 'כי טוב'.", en: "This is the only day on which 'it was good' is not said.", dwell: 4200 },
          { he: "אולי כי הפרדה אינה דבר שלם. אולי כי המלאכה לא נגמרה.", en: "Perhaps because a separation is not a whole thing. Perhaps because the work is not finished.", dwell: 4600 },
          { he: "שמים: תקרה דקה מעל ים שלם.", en: "Sky: a thin roof over a whole sea.", dwell: 3600 }
        ],
        afterword: { he: "וַיְהִי־עֶרֶב וַיְהִי־בֹקֶר יוֹם שֵׁנִי", en: "And there was evening and there was morning, a second day." }
      },
      {
        n: 3,
        name: { he: "יוֹם שְׁלִישִׁי", en: "The Third Day" },
        epithet: { he: "הַיַּבָּשָׁה", en: "Dry Land" },
        utterance: { he: "יִקָּווּ הַמַּיִם מִתַּחַת הַשָּׁמַיִם אֶל־מָקוֹם אֶחָד וְתֵרָאֶה הַיַּבָּשָׁה", en: "Let the waters under the heavens be gathered to one place, and let the dry land appear" },
        verses: [
          {
            ref: "בראשית א׳:ט׳",
            he: "וַיֹּאמֶר אֱלֹהִים יִקָּווּ הַמַּיִם מִתַּחַת הַשָּׁמַיִם אֶל־מָקוֹם אֶחָד וְתֵרָאֶה הַיַּבָּשָׁה וַיְהִי־כֵן׃",
            en: "And God said, Let the waters under the heavens be gathered together unto one place, and let the dry land appear. And it was so."
          },
          {
            ref: "בראשית א׳:י׳",
            he: "וַיִּקְרָא אֱלֹהִים לַיַּבָּשָׁה אֶרֶץ וּלְמִקְוֵה הַמַּיִם קָרָא יַמִּים וַיַּרְא אֱלֹהִים כִּי־טוֹב׃",
            en: "And God called the dry land Earth, and the gathering of the waters he called Seas. And God saw that it was good."
          },
          {
            ref: "בראשית א׳:י״א",
            he: "וַיֹּאמֶר אֱלֹהִים תַּדְשֵׁא הָאָרֶץ דֶּשֶׁא עֵשֶׂב מַזְרִיעַ זֶרַע עֵץ פְּרִי עֹשֶׂה פְּרִי לְמִינוֹ אֲשֶׁר זַרְעוֹ־בוֹ עַל־הָאָרֶץ וַיְהִי־כֵן׃",
            en: "And God said, Let the earth put forth grass, herb yielding seed, fruit tree bearing fruit after its kind, whose seed is in itself, upon the earth. And it was so."
          },
          {
            ref: "בראשית א׳:י״ב",
            he: "וַתּוֹצֵא הָאָרֶץ דֶּשֶׁא עֵשֶׂב מַזְרִיעַ זֶרַע לְמִינֵהוּ וְעֵץ עֹשֶׂה־פְּרִי אֲשֶׁר זַרְעוֹ־בוֹ לְמִינֵהוּ וַיַּרְא אֱלֹהִים כִּי־טוֹב׃",
            en: "And the earth brought forth grass, herb yielding seed after its kind, and tree bearing fruit whose seed was in itself, after its kind. And God saw that it was good."
          }
        ],
        narration: [
          { he: "המים נסוגים. משהו שהיה מתחתיהם כל הזמן עולה ומתייבש.", en: "The waters pull back. Something that was under them all along rises and dries.", dwell: 4200 },
          { he: "האדמה מצוּוה להוציא. והיא מוציאה. זה הדבר הראשון שנברא מתוך דבר אחר.", en: "The earth is told to bring forth. And it brings forth. The first thing made out of another thing.", dwell: 4600 },
          { he: "עץ עושה פרי אשר זרעו בו. כל עץ נושא בתוכו את העץ הבא.", en: "A tree bearing fruit with its seed inside. Every tree carries the next tree within it.", dwell: 4200 },
          { he: "פעמיים היום נאמר 'כי טוב'. כאילו להשלים את מה שחסר אתמול.", en: "Twice today 'it was good' is said. As if to make up for yesterday.", dwell: 4000 },
          { he: "ובין העצים, בלי שאיש ישים לב, שני עצים שעוד יהיה להם שם.", en: "And among the trees, with no one yet to notice, two trees that will one day have names.", dwell: 5000 }
        ],
        afterword: { he: "וַיְהִי־עֶרֶב וַיְהִי־בֹקֶר יוֹם שְׁלִישִׁי", en: "And there was evening and there was morning, a third day." }
      },
      {
        n: 4,
        name: { he: "יוֹם רְבִיעִי", en: "The Fourth Day" },
        epithet: { he: "הַמְּאֹרֹת", en: "The Lights" },
        utterance: { he: "יְהִי מְאֹרֹת בִּרְקִיעַ הַשָּׁמַיִם", en: "Let there be lights in the firmament of the heavens" },
        verses: [
          {
            ref: "בראשית א׳:י״ד",
            he: "וַיֹּאמֶר אֱלֹהִים יְהִי מְאֹרֹת בִּרְקִיעַ הַשָּׁמַיִם לְהַבְדִּיל בֵּין הַיּוֹם וּבֵין הַלָּיְלָה וְהָיוּ לְאֹתֹת וּלְמוֹעֲדִים וּלְיָמִים וְשָׁנִים׃",
            en: "And God said, Let there be lights in the firmament of the heavens to divide the day from the night; and let them be for signs, and for seasons, and for days and years."
          },
          {
            ref: "בראשית א׳:ט״ז",
            he: "וַיַּעַשׂ אֱלֹהִים אֶת־שְׁנֵי הַמְּאֹרֹת הַגְּדֹלִים אֶת־הַמָּאוֹר הַגָּדֹל לְמֶמְשֶׁלֶת הַיּוֹם וְאֶת־הַמָּאוֹר הַקָּטֹן לְמֶמְשֶׁלֶת הַלַּיְלָה וְאֵת הַכּוֹכָבִים׃",
            en: "And God made the two great lights: the greater light to rule the day, and the lesser light to rule the night; and the stars."
          },
          {
            ref: "בראשית א׳:י״ז",
            he: "וַיִּתֵּן אֹתָם אֱלֹהִים בִּרְקִיעַ הַשָּׁמָיִם לְהָאִיר עַל־הָאָרֶץ׃",
            en: "And God set them in the firmament of the heavens to give light upon the earth."
          },
          {
            ref: "בראשית א׳:י״ח",
            he: "וְלִמְשֹׁל בַּיּוֹם וּבַלַּיְלָה וּלֲהַבְדִּיל בֵּין הָאוֹר וּבֵין הַחֹשֶׁךְ וַיַּרְא אֱלֹהִים כִּי־טוֹב׃",
            en: "And to rule over the day and over the night, and to divide the light from the darkness. And God saw that it was good."
          }
        ],
        narration: [
          { he: "האור כבר כאן שלושה ימים. עכשיו נותנים לו כלים.", en: "Light has been here three days already. Now it is given vessels.", dwell: 4000 },
          { he: "הגדול לממשלת היום. הקטן לממשלת הלילה. והכוכבים — כמעט כבדרך אגב.", en: "The great one to rule the day. The small one to rule the night. And the stars — almost an afterthought.", dwell: 4600 },
          { he: "מעכשיו יש זמן. אפשר לספור. אפשר לחכות.", en: "From now on there is time. One can count. One can wait.", dwell: 4000 },
          { he: "אפשר, גם, להתגעגע.", en: "One can, also, long for something.", dwell: 4400 }
        ],
        afterword: { he: "וַיְהִי־עֶרֶב וַיְהִי־בֹקֶר יוֹם רְבִיעִי", en: "And there was evening and there was morning, a fourth day." }
      },
      {
        n: 5,
        name: { he: "יוֹם חֲמִישִׁי", en: "The Fifth Day" },
        epithet: { he: "דָּגָה וָעוֹף", en: "Fish and Fowl" },
        utterance: { he: "יִשְׁרְצוּ הַמַּיִם שֶׁרֶץ נֶפֶשׁ חַיָּה וְעוֹף יְעוֹפֵף עַל־הָאָרֶץ", en: "Let the waters swarm with swarms of living creatures, and let fowl fly above the earth" },
        verses: [
          {
            ref: "בראשית א׳:כ׳",
            he: "וַיֹּאמֶר אֱלֹהִים יִשְׁרְצוּ הַמַּיִם שֶׁרֶץ נֶפֶשׁ חַיָּה וְעוֹף יְעוֹפֵף עַל־הָאָרֶץ עַל־פְּנֵי רְקִיעַ הַשָּׁמָיִם׃",
            en: "And God said, Let the waters swarm with swarms of living creatures, and let fowl fly above the earth across the face of the firmament of the heavens."
          },
          {
            ref: "בראשית א׳:כ״א",
            he: "וַיִּבְרָא אֱלֹהִים אֶת־הַתַּנִּינִם הַגְּדֹלִים וְאֵת כָּל־נֶפֶשׁ הַחַיָּה הָרֹמֶשֶׂת אֲשֶׁר שָׁרְצוּ הַמַּיִם לְמִינֵהֶם וְאֵת כָּל־עוֹף כָּנָף לְמִינֵהוּ וַיַּרְא אֱלֹהִים כִּי־טוֹב׃",
            en: "And God created the great sea-creatures, and every living creature that moves, with which the waters swarmed, after their kind, and every winged fowl after its kind. And God saw that it was good."
          },
          {
            ref: "בראשית א׳:כ״ב",
            he: "וַיְבָרֶךְ אֹתָם אֱלֹהִים לֵאמֹר פְּרוּ וּרְבוּ וּמִלְאוּ אֶת־הַמַּיִם בַּיַּמִּים וְהָעוֹף יִרֶב בָּאָרֶץ׃",
            en: "And God blessed them, saying, Be fruitful and multiply, and fill the waters in the seas, and let fowl multiply in the earth."
          }
        ],
        narration: [
          { he: "עד עכשיו שום דבר לא זז מעצמו. עכשיו המים רוחשים.", en: "Until now nothing moved on its own. Now the water teems.", dwell: 4000 },
          { he: "התנינים הגדולים. הפעם הראשונה מאז השמים והארץ שחוזרת המילה 'ברא'.", en: "The great sea-creatures. The first time since the heavens and the earth that the word 'created' returns.", dwell: 4600 },
          { he: "ברכה ראשונה. פרו ורבו. כלומר: אתם לא לבד, ולא תהיו.", en: "The first blessing. Be fruitful and multiply. Which is to say: you are not alone, and you will not be.", dwell: 4800 },
          { he: "כל ציפור ממריאה ליד ציפור אחרת.", en: "Every bird lifts off beside another bird.", dwell: 4200 }
        ],
        afterword: { he: "וַיְהִי־עֶרֶב וַיְהִי־בֹקֶר יוֹם חֲמִישִׁי", en: "And there was evening and there was morning, a fifth day." }
      },
      {
        n: 6,
        name: { he: "יוֹם הַשִּׁשִּׁי", en: "The Sixth Day" },
        epithet: { he: "הָאָדָם", en: "Humankind" },
        utterance: { he: "נַעֲשֶׂה אָדָם בְּצַלְמֵנוּ כִּדְמוּתֵנוּ", en: "Let us make humankind in our image, after our likeness" },
        verses: [
          {
            ref: "בראשית א׳:כ״ד",
            he: "וַיֹּאמֶר אֱלֹהִים תּוֹצֵא הָאָרֶץ נֶפֶשׁ חַיָּה לְמִינָהּ בְּהֵמָה וָרֶמֶשׂ וְחַיְתוֹ־אֶרֶץ לְמִינָהּ וַיְהִי־כֵן׃",
            en: "And God said, Let the earth bring forth the living creature after its kind: cattle, and creeping thing, and beast of the earth after its kind. And it was so."
          },
          {
            ref: "בראשית א׳:כ״ו",
            he: "וַיֹּאמֶר אֱלֹהִים נַעֲשֶׂה אָדָם בְּצַלְמֵנוּ כִּדְמוּתֵנוּ וְיִרְדּוּ בִדְגַת הַיָּם וּבְעוֹף הַשָּׁמַיִם וּבַבְּהֵמָה וּבְכָל־הָאָרֶץ וּבְכָל־הָרֶמֶשׂ הָרֹמֵשׂ עַל־הָאָרֶץ׃",
            en: "And God said, Let us make humankind in our image, after our likeness, and let them have dominion over the fish of the sea, and over the fowl of the heavens, and over the cattle, and over all the earth, and over every creeping thing that creeps upon the earth."
          },
          {
            ref: "בראשית א׳:כ״ז",
            he: "וַיִּבְרָא אֱלֹהִים אֶת־הָאָדָם בְּצַלְמוֹ בְּצֶלֶם אֱלֹהִים בָּרָא אֹתוֹ זָכָר וּנְקֵבָה בָּרָא אֹתָם׃",
            en: "And God created the human in his image; in the image of God he created him; male and female he created them."
          },
          {
            ref: "בראשית א׳:ל״א",
            he: "וַיַּרְא אֱלֹהִים אֶת־כָּל־אֲשֶׁר עָשָׂה וְהִנֵּה־טוֹב מְאֹד וַיְהִי־עֶרֶב וַיְהִי־בֹקֶר יוֹם הַשִּׁשִּׁי׃",
            en: "And God saw everything that he had made, and behold, it was very good. And there was evening and there was morning, the sixth day."
          }
        ],
        narration: [
          { he: "בהמה. רמש. חיית הארץ. כל אחת למינה, ולכל מין — בני מינו.", en: "Cattle. Creeping things. Beasts of the earth. Each after its kind, and every kind has its own.", dwell: 4400 },
          { he: "ואז המילים משתנות. לא 'יהי'. לא 'תוצא'. אלא: נעשה.", en: "And then the words change. Not 'let there be'. Not 'let it bring forth'. But: let us make.", dwell: 4600 },
          { he: "זכר ונקבה ברא אותם. כך כתוב כאן. זכור את זה. בפרק הבא זה יקרה אחרת.", en: "Male and female he created them. So it is written here. Remember that. In the next chapter it happens differently.", dwell: 5000 },
          { he: "טוב מאוד. לא רק טוב. אבל 'מאוד' היא מילה שאפשר ליפול ממנה.", en: "Very good. Not just good. But 'very' is a word a thing can fall from.", dwell: 5000 }
        ],
        afterword: { he: "וַיְהִי־עֶרֶב וַיְהִי־בֹקֶר יוֹם הַשִּׁשִּׁי", en: "And there was evening and there was morning, the sixth day." }
      },
      {
        n: 7,
        name: { he: "יוֹם הַשְּׁבִיעִי", en: "The Seventh Day" },
        epithet: { he: "שַׁבָּת", en: "Rest" },
        utterance: { he: "וַיִּשְׁבֹּת", en: "And he ceased" },
        verses: [
          {
            ref: "בראשית ב׳:א׳",
            he: "וַיְכֻלּוּ הַשָּׁמַיִם וְהָאָרֶץ וְכָל־צְבָאָם׃",
            en: "And the heavens and the earth were finished, and all their host."
          },
          {
            ref: "בראשית ב׳:ב׳",
            he: "וַיְכַל אֱלֹהִים בַּיּוֹם הַשְּׁבִיעִי מְלַאכְתּוֹ אֲשֶׁר עָשָׂה וַיִּשְׁבֹּת בַּיּוֹם הַשְּׁבִיעִי מִכָּל־מְלַאכְתּוֹ אֲשֶׁר עָשָׂה׃",
            en: "And on the seventh day God finished his work which he had made; and he rested on the seventh day from all his work which he had made."
          },
          {
            ref: "בראשית ב׳:ג׳",
            he: "וַיְבָרֶךְ אֱלֹהִים אֶת־יוֹם הַשְּׁבִיעִי וַיְקַדֵּשׁ אֹתוֹ כִּי בוֹ שָׁבַת מִכָּל־מְלַאכְתּוֹ אֲשֶׁר־בָּרָא אֱלֹהִים לַעֲשׂוֹת׃",
            en: "And God blessed the seventh day and hallowed it, because on it he rested from all his work which God had created to make."
          }
        ],
        narration: [
          { he: "ביום הזה לא נאמר דבר. אין 'ויאמר'. אין 'יהי'.", en: "On this day nothing is said. No 'and he said'. No 'let there be'.", dwell: 4200 },
          { he: "המלאכה נגמרת לא במעשה אחרון אלא בהפסקה.", en: "The work ends not with a last act but with a stopping.", dwell: 4200 },
          { he: "זה הדבר הראשון שמתקדש. לא מקום. לא חפץ. זמן.", en: "This is the first thing made holy. Not a place. Not an object. Time.", dwell: 4600 },
          { he: "העולם שלם. כל מה שיקרה עכשיו — יקרה בתוכו.", en: "The world is complete. Whatever happens now, happens inside it.", dwell: 5000 }
        ],
        afterword: { he: "לא נאמר בו ערב. לא נאמר בו בוקר.", en: "No evening is said of it. No morning." }
      }
    ]
  },

  // ───────────────────────────────────────────────────────────────────────────
  // ACT 2 — EDEN
  // ───────────────────────────────────────────────────────────────────────────
  eden: {
    arrival: {
      verses: [
        {
          ref: "בראשית ב׳:ז׳",
          he: "וַיִּיצֶר ה׳ אֱלֹהִים אֶת־הָאָדָם עָפָר מִן־הָאֲדָמָה וַיִּפַּח בְּאַפָּיו נִשְׁמַת חַיִּים וַיְהִי הָאָדָם לְנֶפֶשׁ חַיָּה׃",
          en: "And the LORD God formed the human of dust from the ground, and breathed into his nostrils the breath of life; and the human became a living soul."
        },
        {
          ref: "בראשית ב׳:ח׳",
          he: "וַיִּטַּע ה׳ אֱלֹהִים גַּן־בְּעֵדֶן מִקֶּדֶם וַיָּשֶׂם שָׁם אֶת־הָאָדָם אֲשֶׁר יָצָר׃",
          en: "And the LORD God planted a garden eastward in Eden; and there he put the human whom he had formed."
        },
        {
          ref: "בראשית ב׳:ט׳",
          he: "וַיַּצְמַח ה׳ אֱלֹהִים מִן־הָאֲדָמָה כָּל־עֵץ נֶחְמָד לְמַרְאֶה וְטוֹב לְמַאֲכָל וְעֵץ הַחַיִּים בְּתוֹךְ הַגָּן וְעֵץ הַדַּעַת טוֹב וָרָע׃",
          en: "And out of the ground the LORD God made to grow every tree that is pleasant to the sight and good for food; the tree of life also in the midst of the garden, and the tree of the knowledge of good and evil."
        },
        {
          ref: "בראשית ב׳:ט״ו",
          he: "וַיִּקַּח ה׳ אֱלֹהִים אֶת־הָאָדָם וַיַּנִּחֵהוּ בְגַן־עֵדֶן לְעָבְדָהּ וּלְשָׁמְרָהּ׃",
          en: "And the LORD God took the human and set him in the garden of Eden to work it and to keep it."
        }
      ],
      narration: [
        { he: "עפר. ונשימה לתוך העפר. זה כל מה שהוא.", en: "Dust. And a breath into the dust. That is all he is.", dwell: 4200 },
        { he: "הגן ניטע לפניו ובשבילו. כל עץ נחמד למראה. הוא לא צריך לבחור.", en: "The garden is planted before him and for him. Every tree pleasant to look at. He does not need to choose.", dwell: 4600 },
        { he: "שני עצים באמצע. הוא עובר לידם. אין לו עדיין סיבה לעצור.", en: "Two trees in the middle. He walks past them. He has no reason yet to stop.", dwell: 4400 },
        { he: "לעבדה ולשמרה. גם בגן עדן יש עבודה. אבל היא קלה, ועושים אותה לבד.", en: "To work it and to keep it. Even in Eden there is work. But it is light, and it is done alone.", dwell: 4800 }
      ]
    },

    command: {
      verses: [
        {
          ref: "בראשית ב׳:ט״ז",
          he: "וַיְצַו ה׳ אֱלֹהִים עַל־הָאָדָם לֵאמֹר מִכֹּל עֵץ־הַגָּן אָכֹל תֹּאכֵל׃",
          en: "And the LORD God commanded the human, saying, Of every tree of the garden thou mayest freely eat;"
        },
        {
          ref: "בראשית ב׳:י״ז",
          he: "וּמֵעֵץ הַדַּעַת טוֹב וָרָע לֹא תֹאכַל מִמֶּנּוּ כִּי בְּיוֹם אֲכָלְךָ מִמֶּנּוּ מוֹת תָּמוּת׃",
          en: "But of the tree of the knowledge of good and evil, thou shalt not eat of it: for in the day that thou eatest thereof thou shalt surely die."
        }
      ],
      narration: [
        { he: "המילה הראשונה שנאמרת לו היא: אכול. מכל עץ. אכול תאכל.", en: "The first word said to him is: eat. Of every tree. Eat freely.", dwell: 4200 },
        { he: "ואז מילה אחת של 'לא'. עץ אחד. מתוך גן שלם.", en: "Then one word of 'no'. One tree. Out of a whole garden.", dwell: 4200 },
        { he: "מות תמות. הוא לא יודע מה זה מוות. אין עדיין דבר כזה בעולם.", en: "Thou shalt surely die. He does not know what dying is. There is no such thing yet in the world.", dwell: 4800 },
        { he: "הוא מהנהן. זה נראה קל.", en: "He nods. It seems easy.", dwell: 4000 }
      ]
    },

    naming: {
      intro: { he: "הן עוברות לפניך, זוג אחר זוג. תן לכל אחת שם.", en: "They pass before you, pair after pair. Give each one a name." },
      animals: [
        {
          he: "שׁוֹר", en: "Ox", translit: "shor",
          line: { he: "שור. גדול, איטי. יש עוד אחד מאחוריו, בדיוק כמוהו.", en: "Ox. Big, slow. There is another behind it, just like it." }
        },
        {
          he: "אַרְיֵה", en: "Lion", translit: "aryeh",
          line: { he: "אריה. הם באים שניים. כנראה כך זה אצל אריות.", en: "Lion. They come as two. That must be how it is with lions." }
        },
        {
          he: "צְבִי", en: "Gazelle", translit: "tzvi",
          line: { he: "צבי. גם שניים. היא קפצה — והוא קפץ אחריה בלי להסתכל.", en: "Gazelle. Two again. She leapt — and he leapt after her without looking." }
        },
        {
          he: "נֶשֶׁר", en: "Eagle", translit: "nesher",
          line: { he: "נשר. אחד למעלה, אחד מתחתיו, חגים באותו מעגל. גם אלה.", en: "Eagle. One above, one beneath, circling the same circle. These too." }
        },
        {
          he: "שׁוּעָל", en: "Fox", translit: "shu'al",
          line: { he: "שועל. שניים. התחלתי לספור. אני לא יודע למה אני סופר.", en: "Fox. Two. I have begun to count. I do not know why I am counting." }
        },
        {
          he: "פִּיל", en: "Elephant", translit: "pil",
          line: { he: "פיל. היא מניחה את החדק על גבו. הוא לא זז. כנראה זה נעים.", en: "Elephant. She rests her trunk on his back. He does not move. It must be pleasant." }
        },
        {
          he: "זְאֵב", en: "Wolf", translit: "ze'ev",
          line: { he: "זאב. שניים. אפילו הזאב.", en: "Wolf. Two. Even the wolf." }
        },
        {
          he: "סוּס", en: "Horse", translit: "sus",
          line: { he: "סוס. הם עומדים צוואר על צוואר. אני מסתכל סביבי. אין צוואר.", en: "Horse. They stand neck across neck. I look around me. There is no neck." }
        },
        {
          he: "עוֹרֵב", en: "Raven", translit: "orev",
          line: { he: "עורב. שחור ושחור. אין אחד מהם שהולך לבדו. אף אחד.", en: "Raven. Black and black. Not one of them walks alone. Not one." }
        },
        {
          he: "יוֹנָה", en: "Dove", translit: "yonah",
          line: { he: "יונה. שתיים. הן מביטות זו בזו. אני נותן להן שם, ואין מי שישמע אותי אומר אותו.", en: "Dove. Two. They look at each other. I give them a name, and there is no one to hear me say it." }
        }
      ],
      outro: {
        verses: [
          {
            ref: "בראשית ב׳:י״ט",
            he: "וַיִּצֶר ה׳ אֱלֹהִים מִן־הָאֲדָמָה כָּל־חַיַּת הַשָּׂדֶה וְאֵת כָּל־עוֹף הַשָּׁמַיִם וַיָּבֵא אֶל־הָאָדָם לִרְאוֹת מַה־יִּקְרָא־לוֹ וְכֹל אֲשֶׁר יִקְרָא־לוֹ הָאָדָם נֶפֶשׁ חַיָּה הוּא שְׁמוֹ׃",
            en: "And out of the ground the LORD God formed every beast of the field and every fowl of the heavens, and brought them unto the human to see what he would call them; and whatsoever the human called every living creature, that was its name."
          },
          {
            ref: "בראשית ב׳:כ׳",
            he: "וַיִּקְרָא הָאָדָם שֵׁמוֹת לְכָל־הַבְּהֵמָה וּלְעוֹף הַשָּׁמַיִם וּלְכֹל חַיַּת הַשָּׂדֶה וּלְאָדָם לֹא־מָצָא עֵזֶר כְּנֶגְדּוֹ׃",
            en: "And the human gave names to all cattle, and to the fowl of the heavens, and to every beast of the field; but for the human there was not found a helper to match him."
          }
        ],
        narration: [
          { he: "כולן קיבלו שם. כולן הלכו. בזוגות.", en: "All of them received a name. All of them left. In pairs.", dwell: 4400 },
          { he: "'ולאדם לא מצא'. לא נאמר מי חיפש.", en: "'And for the human there was not found.' It is not said who was searching.", dwell: 4800 },
          { he: "הגן שקט. זה אותו שקט כמו קודם. רק שעכשיו הוא שומע אותו.", en: "The garden is quiet. It is the same quiet as before. Only now he hears it.", dwell: 5200 }
        ]
      }
    },

    loneliness: {
      lines: [
        { he: "יש כאן הכול. אני יודע את זה. ספרתי.", en: "Everything is here. I know that. I counted.", dwell: 3600 },
        { he: "לכל דבר שיש לו צל יש צל שני לידו.", en: "Everything that has a shadow has a second shadow beside it.", dwell: 4000 },
        { he: "לא ידעתי שיש מילה כזאת. לבד. עכשיו יש, והיא שלי.", en: "I did not know there was such a word. Alone. Now there is, and it is mine.", dwell: 4600 },
        { he: "אני מדבר, והקול חוזר מהעצים. זו לא תשובה. זה אני.", en: "I speak, and the voice comes back off the trees. It is not an answer. It is me.", dwell: 4600 },
        { he: "כשאני עוצם עיניים אין מי שיראה שעצמתי.", en: "When I close my eyes there is no one to see that I closed them.", dwell: 5000 },
        { he: "על הכול נאמר: טוב. עליי נאמר: לא טוב.", en: "Of everything it was said: good. Of me it is said: not good.", dwell: 5200 }
      ]
    }
  },

  // ───────────────────────────────────────────────────────────────────────────
  // ACT 3 — EVE
  // ───────────────────────────────────────────────────────────────────────────
  eve: {
    sleep: {
      verses: [
        {
          ref: "בראשית ב׳:י״ח",
          he: "וַיֹּאמֶר ה׳ אֱלֹהִים לֹא־טוֹב הֱיוֹת הָאָדָם לְבַדּוֹ אֶעֱשֶׂהּ־לּוֹ עֵזֶר כְּנֶגְדּוֹ׃",
          en: "And the LORD God said, It is not good that the human should be alone; I will make him a helper to match him."
        },
        {
          ref: "בראשית ב׳:כ״א",
          he: "וַיַּפֵּל ה׳ אֱלֹהִים תַּרְדֵּמָה עַל־הָאָדָם וַיִּישָׁן וַיִּקַּח אַחַת מִצַּלְעֹתָיו וַיִּסְגֹּר בָּשָׂר תַּחְתֶּנָּה׃",
          en: "And the LORD God caused a deep sleep to fall upon the human, and he slept; and he took one of his ribs, and closed up the flesh in its place."
        }
      ],
      narration: [
        { he: "הוא לא מבקש. הוא לא יודע מה לבקש.", en: "He does not ask. He does not know what to ask for.", dwell: 4200 },
        { he: "התרדמה יורדת עליו כמו מים. הוא לא נלחם בה.", en: "The deep sleep comes down on him like water. He does not fight it.", dwell: 4200 },
        { he: "מה שנלקח ממנו נלקח בלי שיראה. כך לעולם לא יוכל לומר: זה שלי.", en: "What is taken from him is taken unseen. So he will never be able to say: that is mine.", dwell: 5000 },
        { he: "ויסגור בשר תחתנה. הפצע הראשון בעולם, והוא נסגר לפני שנפתח.", en: "And he closed up the flesh. The first wound in the world, and it closes before it opens.", dwell: 5000 }
      ]
    },

    making: {
      narration: [
        { he: "לא עפר הפעם. לא מילה. בנייה.", en: "Not dust this time. Not a word. A building.", dwell: 4000 },
        { he: "הפועל הוא 'ויבן'. כמו בית. כמו דבר שמישהו עתיד לגור בו.", en: "The verb is 'he built'. As one builds a house. As a thing someone will live in.", dwell: 4600 },
        { he: "היא פוקחת עיניים אל עולם שכבר יש בו מישהו. לו זה לא היה.", en: "She opens her eyes onto a world that already has someone in it. He never had that.", dwell: 4800 },
        { he: "הוא ישן. היא מחכה שיתעורר. זו ההמתנה הראשונה.", en: "He sleeps. She waits for him to wake. It is the first waiting.", dwell: 4800 }
      ]
    },

    waking: {
      verses: [
        {
          ref: "בראשית ב׳:כ״ב",
          he: "וַיִּבֶן ה׳ אֱלֹהִים אֶת־הַצֵּלָע אֲשֶׁר־לָקַח מִן־הָאָדָם לְאִשָּׁה וַיְבִאֶהָ אֶל־הָאָדָם׃",
          en: "And the rib, which the LORD God had taken from the human, he built into a woman, and brought her unto the human."
        },
        {
          ref: "בראשית ב׳:כ״ג",
          he: "וַיֹּאמֶר הָאָדָם זֹאת הַפַּעַם עֶצֶם מֵעֲצָמַי וּבָשָׂר מִבְּשָׂרִי לְזֹאת יִקָּרֵא אִשָּׁה כִּי מֵאִישׁ לֻקֳחָה־זֹּאת׃",
          en: "And the human said, This one at last is bone of my bones and flesh of my flesh; this one shall be called Woman, for from Man was this one taken."
        },
        {
          ref: "בראשית ב׳:כ״ד",
          he: "עַל־כֵּן יַעֲזָב־אִישׁ אֶת־אָבִיו וְאֶת־אִמּוֹ וְדָבַק בְּאִשְׁתּוֹ וְהָיוּ לְבָשָׂר אֶחָד׃",
          en: "Therefore shall a man leave his father and his mother, and cleave unto his wife, and they shall be one flesh."
        }
      ],
      adamFirstWords: { he: "זֹאת הַפַּעַם", en: "This one, at last" },
      narration: [
        { he: "הוא פוקח עיניים, ומישהו מביט בחזרה.", en: "He opens his eyes, and someone is looking back.", dwell: 4400 },
        { he: "'זאת הפעם'. כלומר: היו פעמים. כלומר: הוא חיפש, גם אם לא ידע.", en: "'This time'. Which means there were other times. Which means he was searching, even if he did not know it.", dwell: 5000 },
        { he: "המילים הראשונות של אדם אינן על אלוהים ואינן על הגן. הן עליה.", en: "The first words of a human are not about God, and not about the garden. They are about her.", dwell: 4800 },
        { he: "עצם מעצמי. הוא לא יודע מה נלקח ממנו. אבל הוא מזהה אותו.", en: "Bone of my bones. He does not know what was taken from him. But he recognizes it.", dwell: 5200 }
      ]
    },

    naked: {
      verses: [
        {
          ref: "בראשית ב׳:כ״ה",
          he: "וַיִּהְיוּ שְׁנֵיהֶם עֲרוּמִּים הָאָדָם וְאִשְׁתּוֹ וְלֹא יִתְבֹּשָׁשׁוּ׃",
          en: "And they were both naked, the human and his wife, and were not ashamed."
        }
      ]
    }
  },

  // ───────────────────────────────────────────────────────────────────────────
  // ACT 4 — THE SERPENT
  // ───────────────────────────────────────────────────────────────────────────
  serpent: {
    intro: {
      verses: [
        {
          ref: "בראשית ג׳:א׳",
          he: "וְהַנָּחָשׁ הָיָה עָרוּם מִכֹּל חַיַּת הַשָּׂדֶה אֲשֶׁר עָשָׂה ה׳ אֱלֹהִים וַיֹּאמֶר אֶל־הָאִשָּׁה אַף כִּי־אָמַר אֱלֹהִים לֹא תֹאכְלוּ מִכֹּל עֵץ הַגָּן׃",
          en: "Now the serpent was more cunning than any beast of the field which the LORD God had made. And he said unto the woman, Yea, hath God said, Ye shall not eat of any tree of the garden?"
        }
      ],
      narration: [
        { he: "ערום. אותן אותיות כמו 'ערומים' בפסוק הקודם. הכתוב רוצה שתשמע את ההד.", en: "Cunning — arum. The same letters as 'naked' in the verse before. The text wants you to hear the echo.", dwell: 5000 },
        { he: "הוא לא מתגנב. הוא ניגש. בגן אין עדיין ממה לפחד.", en: "It does not creep. It approaches. In the garden there is nothing yet to fear.", dwell: 4400 },
        { he: "הוא לא פונה לאדם. הוא פונה אליה — זו שלא שמעה את הציווי באוזניה. היא שמעה אותו ממנו.", en: "It does not go to the man. It goes to her — the one who did not hear the command with her own ears. She heard it from him.", dwell: 5200 },
        { he: "המשפט הראשון שלו הוא שאלה.", en: "Its first sentence is a question.", dwell: 4200 }
      ]
    },

    // SCENE A — the serpent and Eve. The player is Eve.
    toEve: {
      nodes: [
        {
          id: "doubt",
          serpent: {
            he: "באמת? אלוהים אמר שלא תאכלו מכל עץ הגן?",
            en: "Truly? God said you are not to eat of any tree in the garden?"
          },
          gloss: {
            he: "הוא פותח בטעות מכוונת. היא תמהר לתקן אותו — וכך תמצא את עצמה מדברת על הציווי במילים שלו.",
            en: "It opens with a deliberate error. She will hurry to correct it — and find herself discussing the command in its words."
          },
          replies: [
            {
              he: "למה אתה שואל? אנחנו אוכלים ממה שאנחנו רוצים.",
              en: "Why do you ask? We eat what we like.",
              sway: 0,
              retort: { he: "ממה שאתם רוצים. כן. חוץ מאחד, לא?", en: "What you like. Yes. Except one, no?" }
            },
            {
              he: "לא. רק מעץ אחד. מפרי העץ שבתוך הגן אמר אלוהים: לא תאכלו ממנו ולא תיגעו בו, פן תמותו.",
              en: "No. Only one tree. Of the fruit of the tree in the midst of the garden God said: you shall not eat of it, nor touch it, lest you die.",
              sway: 1,
              retort: { he: "ולא תיגעו? מעניין. אני לא זוכר שנאמר 'לא תיגעו'.", en: "Nor touch it? Interesting. I do not recall 'nor touch' being said." }
            },
            {
              he: "מעץ אחד בלבד. ואני אפילו לא יודעת למה.",
              en: "Only one tree. And I do not even know why.",
              sway: 2,
              retort: { he: "אה. אז לא רק אני שואל.", en: "Ah. So it is not only I who wonders." }
            }
          ]
        },
        {
          id: "touch",
          serpent: {
            he: "בואי נבדוק משהו קטן. געי בו. רק געי. הנה — כלום. את חיה. אז אולי גם הדבר השני אינו בדיוק כך.",
            en: "Let us test one small thing. Touch it. Only touch. There — nothing. You are alive. So perhaps the other thing is not quite so either."
          },
          gloss: {
            he: "הוא מצא את התוספת שלה, והוא משתמש בה. אם חצי מהאיסור הוא המצאה — למה שהחצי השני לא יהיה?",
            en: "It found her addition, and it uses it. If half the prohibition was invented — why not the other half?"
          },
          replies: [
            {
              he: "לא. לא נגעתי ולא אגע.",
              en: "No. I did not touch it and I will not.",
              sway: 0,
              retort: { he: "לא נגעת. אבל הסתכלת. גם זה לא נאסר, נכון?", en: "You did not touch. But you looked. That too was not forbidden, was it?" }
            },
            {
              he: "אני נוגעת רק כי אני יודעת שזה לא העניין.",
              en: "I touch it only because I know that is not the point.",
              sway: 1,
              retort: { he: "בוודאי. העניין הוא מה שבפנים.", en: "Of course. The point is what is inside." }
            },
            {
              he: "...כלום. באמת כלום.",
              en: "...Nothing. Truly nothing.",
              sway: 2,
              retort: { he: "כלום. ואמרו לך שתמותי.", en: "Nothing. And you were told you would die." }
            }
          ]
        },
        {
          id: "death",
          serpent: {
            he: "לא תמותו. הביטי סביבך: יש כאן משהו שמת? מה זה בכלל, למות? מישהו הראה לך?",
            en: "You will not die. Look around you: is there anything here that dies? What is it even, to die? Has anyone shown you?"
          },
          gloss: {
            he: "זה השקר היחיד שלו, והוא עטוף באמת: בעולם הזה עדיין אין מוות שאפשר להצביע עליו. הוא מוכר לה את ההיעדר כהוכחה.",
            en: "This is its one lie, and it is wrapped in a truth: in this world there is as yet no death to point at. It sells her the absence as proof."
          },
          replies: [
            {
              he: "אני לא צריכה לראות מוות כדי להאמין למי שאמר.",
              en: "I do not need to see death to believe the one who said it.",
              sway: 0,
              retort: { he: "להאמין. מילה יפה. היא אומרת שאת לא יודעת.", en: "Believe. A fine word. It means you do not know." }
            },
            {
              he: "אולי לא מיד. אולי 'ביום' זה לא ממש ביום.",
              en: "Perhaps not at once. Perhaps 'on the day' does not quite mean on the day.",
              sway: 1,
              retort: { he: "הנה. את כבר מתרגמת אותו. מי שמתרגמת כבר לא רק מצייתת.", en: "There. You are already translating him. One who translates is no longer merely obeying." }
            },
            {
              he: "באמת, מה זה למות? אני לא יודעת.",
              en: "Truly, what is it to die? I do not know.",
              sway: 2,
              retort: { he: "לא. אבל את יכולה לדעת. זה בדיוק מה שהעץ הזה נותן.", en: "No. But you could know. That is exactly what this tree gives." }
            }
          ]
        },
        {
          id: "withholding",
          serpent: {
            he: "כי יודע אלוהים שביום שתאכלו ממנו ייפקחו עיניכם. חשבי: למה לשים עץ כזה באמצע הגן ולומר 'לא'? מה שומרים ממי שאוהבים?",
            en: "For God knows that on the day you eat of it your eyes will be opened. Think: why put such a tree in the middle of the garden and say 'no'? What does one keep from those one loves?"
          },
          gloss: {
            he: "המהלך המרכזי. האיסור מוצג מחדש כהסתרה. הוא לא אומר שאלוהים רע. הוא אומר שאלוהים שומר משהו לעצמו — וזה, בדרכו, נכון.",
            en: "The central move. The prohibition is recast as a withholding. It does not say God is bad. It says God is keeping something for himself — which, in its way, is true."
          },
          replies: [
            {
              he: "מה ששומרים — שומרים כי הוא מסוכן. לא כי הוא יקר.",
              en: "What is kept back is kept because it is dangerous. Not because it is precious.",
              sway: 0,
              retort: { he: "ומי החליט שאת לא מסוגלת לעמוד במסוכן?", en: "And who decided that you cannot bear what is dangerous?" }
            },
            {
              he: "אולי הוא רוצה שנבקש.",
              en: "Perhaps he wants us to ask.",
              sway: 1,
              retort: { he: "ביקשתם?", en: "Have you asked?" }
            },
            {
              he: "עיניים פקוחות. ...הוא באמת אמר ככה? 'ייפקחו עיניכם'?",
              en: "Eyes opened. ...Did he truly say it so? 'Your eyes will be opened'?",
              sway: 3,
              retort: { he: "הוא לא היה צריך. העיניים שלך כבר פקוחות למחצה. את מרגישה את זה.", en: "He did not need to. Your eyes are already half open. You can feel it." }
            }
          ]
        },
        {
          id: "like-god",
          serpent: {
            he: "והייתם כאלוהים, יודעי טוב ורע. לא פחות ממנו. לא שונים ממנו. אני לא אומר לך לאכול. אני רק אומר לך מה יש שם. מה תעשי עם זה — שלך.",
            en: "And you shall be as God, knowing good and evil. Not less than him. Not other than him. I am not telling you to eat. I am only telling you what is there. What you do with that — is yours."
          },
          gloss: {
            he: "הסיום. הוא נסוג צעד אחורה ומשאיר לה את הבחירה — כי בחירה שנראית חופשית נעשית ברצון. ומה שהוא אמר ייאמר שוב, מפי אלוהים עצמו: 'הן האדם היה כאחד ממנו'.",
            en: "The close. It steps back and leaves her the choice — because a choice that feels free is made willingly. And what it said will be said again, by God himself: 'the human has become as one of us'."
          },
          replies: [
            {
              he: "לך. אני לא רוצה לשמוע עוד.",
              en: "Go. I will hear no more.",
              sway: 0,
              retort: { he: "אני הולך. העץ נשאר.", en: "I go. The tree stays." }
            },
            {
              he: "אני לא רוצה להיות אלוהים. אני רק רוצה לדעת.",
              en: "I do not want to be God. I only want to know.",
              sway: 2,
              retort: { he: "זה אותו הדבר. זה מה שהוא יודע ואת לא.", en: "It is the same thing. That is what he knows and you do not." }
            },
            {
              he: "...אני רק אסתכל.",
              en: "...I will only look.",
              sway: 3,
              retort: { he: "בוודאי. רק להסתכל.", en: "Of course. Only look." }
            }
          ]
        }
      ],
      close: {
        verses: [
          {
            ref: "בראשית ג׳:ו׳",
            he: "וַתֵּרֶא הָאִשָּׁה כִּי טוֹב הָעֵץ לְמַאֲכָל וְכִי תַאֲוָה־הוּא לָעֵינַיִם וְנֶחְמָד הָעֵץ לְהַשְׂכִּיל וַתִּקַּח מִפִּרְיוֹ וַתֹּאכַל וַתִּתֵּן גַּם־לְאִישָׁהּ עִמָּהּ וַיֹּאכַל׃",
            en: "And the woman saw that the tree was good for food, and that it was a delight to the eyes, and the tree was to be desired to make one wise; and she took of its fruit, and ate, and gave also unto her husband with her; and he ate."
          }
        ],
        narration: [
          { he: "לא נאמר מיד 'ותאכל'. קודם: ותרא.", en: "It does not say at once 'she ate'. First: she saw.", dwell: 4200 },
          { he: "טוב למאכל. תאווה לעיניים. נחמד להשכיל. שלוש סיבות. הנחש לא נתן אף אחת מהן. היא מצאה אותן לבד.", en: "Good for food. A delight to the eyes. Desirable for wisdom. Three reasons. The serpent gave none of them. She found them herself.", dwell: 5600 },
          { he: "הנחש כבר לא מוזכר. הוא לא צריך להיות שם.", en: "The serpent is no longer mentioned. It does not need to be there.", dwell: 4600 },
          { he: "אותו עץ. אותם ענפים. רק העיניים אחרות.", en: "Same tree. Same branches. Only the eyes are different.", dwell: 5000 }
        ]
      }
    },

    // SCENE B — Eve and Adam. The player is still Eve.
    toAdam: {
      intro: {
        narration: [
          { he: "פרי בידה. היא עוד לא יודעת אם משהו השתנה. הוא מגיע ממרחק, שמח לראות אותה.", en: "Fruit in her hand. She does not yet know whether anything has changed. He comes from far off, glad to see her.", dwell: 5000 },
          { he: "היא יודעת בדיוק איך זה נעשה. זה נעשה לה לפני רגע.", en: "She knows exactly how it is done. It was done to her a moment ago.", dwell: 4800 },
          { he: "בחר את המילים שלה.", en: "Choose her words.", dwell: 4200 }
        ]
      },
      nodes: [
        {
          id: "greeting",
          adam: {
            he: "הנה את. חיפשתי אותך ליד הנהר. מה יש לך ביד?",
            en: "There you are. I looked for you by the river. What is that in your hand?"
          },
          gloss: {
            he: "הוא שואל בלי חשד. השאלה שלו היא פתח. הנחש התחיל בדיוק כך — בשאלה.",
            en: "He asks without suspicion. His question is an opening. The serpent began exactly so — with a question."
          },
          replies: [
            {
              he: "פרי. מהעץ. מהעץ ההוא.",
              en: "Fruit. From the tree. From that tree.",
              sway: 0,
              retort: { he: "מהעץ ההוא? ...נגעת בו?", en: "From that tree? ...You touched it?" }
            },
            {
              he: "מתנה. חכה — קודם תגיד לי: אתה סומך עליי?",
              en: "A gift. Wait — first tell me: do you trust me?",
              sway: 1,
              retort: { he: "ברור שאני סומך עלייך. את עצם מעצמיי.", en: "Of course I trust you. You are bone of my bones." }
            },
            {
              he: "משהו שאתה צריך לראות. בוא. שב איתי.",
              en: "Something you need to see. Come. Sit with me.",
              sway: 2,
              retort: { he: "אני יושב. אני אוהב כשאת אומרת 'בוא'.", en: "I am sitting. I love it when you say 'come'." }
            }
          ]
        },
        {
          id: "touched",
          adam: {
            he: "זה מהעץ שבאמצע. הוא אמר לי בעצמו. מות תמות. את... את בסדר?",
            en: "That is from the tree in the middle. He told me himself. Thou shalt surely die. Are you... are you all right?"
          },
          gloss: {
            he: "הוא מודאג לה, לא לעצמו. זו החולשה שהיא תפעיל: אהבתו.",
            en: "He is worried for her, not for himself. That is the weakness she will press: his love."
          },
          replies: [
            {
              he: "לא. אני לא בסדר. אני לא יודעת מה עשיתי.",
              en: "No. I am not all right. I do not know what I have done.",
              sway: 0,
              retort: { he: "אז נלך אליו יחד. נגיד לו. הוא יבין.", en: "Then we go to him together. We tell him. He will understand." }
            },
            {
              he: "תסתכל עליי. אני כאן. אני חיה. זה כל מה שאני אומרת.",
              en: "Look at me. I am here. I am alive. That is all I am saying.",
              sway: 1,
              retort: { he: "את חיה. ...כן. את נראית אפילו — אני לא יודע. אחרת.", en: "You are alive. ...Yes. You even look — I do not know. Different." }
            },
            {
              he: "נגעתי. ואכלתי. ואני עומדת מולך. אז מה בדיוק הוא אמר לך?",
              en: "I touched it. And I ate. And I am standing before you. So what exactly did he say to you?",
              sway: 2,
              retort: { he: "הוא אמר 'ביום אכלך'. ...היום עוד לא נגמר.", en: "He said 'on the day you eat'. ...The day is not over yet." }
            }
          ]
        },
        {
          id: "alone",
          adam: {
            he: "אם זה נכון — אם את באמת תמותי — אז מה יהיה איתי?",
            en: "If it is true — if you really will die — then what becomes of me?"
          },
          gloss: {
            he: "הנה זה. הוא לא שואל על טוב ורע. הוא שואל על הבדידות. היא יודעת בדיוק כמה הוא פוחד ממנה — היא נבראה בגללה.",
            en: "There it is. He is not asking about good and evil. He is asking about being alone. She knows exactly how much he fears it — she was made because of it."
          },
          replies: [
            {
              he: "תהיה איתו. כמו שהיית לפניי.",
              en: "You will be with him. As you were before me.",
              sway: 0,
              retort: { he: "לפנייך לא היה 'אני'. לא ככה.", en: "Before you there was no 'me'. Not like this." }
            },
            {
              he: "אני לא יודעת. אבל אני יודעת מה הייתי רוצה שתעשה אם זה היה הפוך.",
              en: "I do not know. But I know what I would want you to do if it were the other way.",
              sway: 2,
              retort: { he: "הייתי אוכל. את יודעת שהייתי אוכל.", en: "I would eat. You know I would eat." }
            },
            {
              he: "אז אל תיתן לי ללכת לבד. לא לשם.",
              en: "Then do not let me go alone. Not there.",
              sway: 3,
              retort: { he: "...לא. לא לבד. לא שוב.", en: "...No. Not alone. Not again." }
            }
          ]
        },
        {
          id: "offer",
          adam: {
            he: "תני לי.",
            en: "Give it to me."
          },
          gloss: {
            he: "היא לא צריכה לומר דבר. אבל גם השתיקה היא בחירה. הפסוק אומר: 'ותתן גם לאישהּ עמהּ ויאכל'. עמהּ. הוא היה שם כל הזמן.",
            en: "She need say nothing. But the silence too is a choice. The verse says: 'and she gave also to her husband with her, and he ate'. With her. He was there the whole time."
          },
          replies: [
            {
              he: "לא. חכה. תן לי לחשוב רגע.",
              en: "No. Wait. Let me think a moment.",
              sway: 0,
              retort: { he: "אין מה לחשוב. את אכלת. אני איתך.", en: "There is nothing to think. You ate. I am with you." }
            },
            {
              he: "רק אם אתה בטוח. אני לא רוצה שזה יהיה בגללי.",
              en: "Only if you are sure. I do not want it to be because of me.",
              sway: 2,
              retort: { he: "זה בגללך. זה בסדר. הכול אצלי בגללך.", en: "It is because of you. That is all right. Everything in me is because of you." }
            },
            {
              he: "(היא מושיטה.)",
              en: "(She holds it out.)",
              sway: 3,
              retort: { he: "(הוא לוקח.)", en: "(He takes it.)" }
            }
          ]
        }
      ],
      close: {
        narration: [
          { he: "'ויאכל'. מילה אחת. בלי 'וירא', בלי שלוש סיבות. הוא לא היה צריך סיבות.", en: "'And he ate'. One word. No 'and he saw', no three reasons. He needed no reasons.", dwell: 5000 },
          { he: "הנחש דיבר אליה. היא דיברה אליו. הוא לא דיבר עם איש. הוא רק לא רצה להישאר.", en: "The serpent spoke to her. She spoke to him. He spoke to no one. He only did not want to be left.", dwell: 5200 },
          { he: "בחרת את המילים. זכור איך זה הרגיש.", en: "You chose the words. Remember what that felt like.", dwell: 5200 }
        ]
      }
    }
  },

  // ───────────────────────────────────────────────────────────────────────────
  // ACT 5 — THE FALL AND THE EXILE
  // ───────────────────────────────────────────────────────────────────────────
  fall: {
    eating: {
      verses: [
        {
          ref: "בראשית ג׳:ו׳",
          he: "וַתֵּרֶא הָאִשָּׁה כִּי טוֹב הָעֵץ לְמַאֲכָל וְכִי תַאֲוָה־הוּא לָעֵינַיִם וְנֶחְמָד הָעֵץ לְהַשְׂכִּיל וַתִּקַּח מִפִּרְיוֹ וַתֹּאכַל וַתִּתֵּן גַּם־לְאִישָׁהּ עִמָּהּ וַיֹּאכַל׃",
          en: "And the woman saw that the tree was good for food, and that it was a delight to the eyes, and the tree was to be desired to make one wise; and she took of its fruit, and ate, and gave also unto her husband with her; and he ate."
        }
      ],
      narration: [
        { he: "פרי. סתם פרי. לא נאמר איזה.", en: "Fruit. Just fruit. It is not said which.", dwell: 4000 },
        { he: "היא אוכלת. רגע. כלום. ואז היא נותנת לו.", en: "She eats. A moment. Nothing. And then she gives it to him.", dwell: 4600 },
        { he: "הוא אוכל. ועכשיו — שניהם.", en: "He eats. And now — both.", dwell: 4800 }
      ]
    },

    eyesOpen: {
      verses: [
        {
          ref: "בראשית ג׳:ז׳",
          he: "וַתִּפָּקַחְנָה עֵינֵי שְׁנֵיהֶם וַיֵּדְעוּ כִּי עֵירֻמִּם הֵם וַיִּתְפְּרוּ עֲלֵה תְאֵנָה וַיַּעֲשׂוּ לָהֶם חֲגֹרֹת׃",
          en: "And the eyes of them both were opened, and they knew that they were naked; and they sewed fig leaves together, and made themselves loincloths."
        }
      ],
      narration: [
        { he: "הנחש הבטיח שהעיניים ייפקחו. הן נפקחות. הוא לא שיקר.", en: "The serpent promised the eyes would open. They open. It did not lie.", dwell: 4600 },
        { he: "הדבר הראשון שהם רואים הוא את עצמם.", en: "The first thing they see is themselves.", dwell: 4400 },
        { he: "עירומים. הם היו כך אתמול. אתמול זה היה כלום.", en: "Naked. They were so yesterday. Yesterday it was nothing.", dwell: 4600 },
        { he: "עלה תאנה. הדבר הראשון שאדם עושה בידיו הוא כיסוי.", en: "A fig leaf. The first thing a human makes with his hands is a covering.", dwell: 5000 }
      ]
    },

    hiding: {
      verses: [
        {
          ref: "בראשית ג׳:ח׳",
          he: "וַיִּשְׁמְעוּ אֶת־קוֹל ה׳ אֱלֹהִים מִתְהַלֵּךְ בַּגָּן לְרוּחַ הַיּוֹם וַיִּתְחַבֵּא הָאָדָם וְאִשְׁתּוֹ מִפְּנֵי ה׳ אֱלֹהִים בְּתוֹךְ עֵץ הַגָּן׃",
          en: "And they heard the voice of the LORD God walking in the garden in the cool of the day; and the human and his wife hid themselves from the presence of the LORD God amongst the trees of the garden."
        }
      ],
      narration: [
        { he: "קול. אותו קול שאמר 'אכול תאכל'.", en: "A voice. The same voice that said 'eat freely'.", dwell: 4200 },
        { he: "לרוח היום. שעת אחר הצהריים. הוא מתהלך, כמו תמיד, כנראה.", en: "In the breeze of the day. Late afternoon. He walks, as always, it seems.", dwell: 4400 },
        { he: "הם מתחבאים בין עצים. מתחבאים ממי שנטע אותם.", en: "They hide among trees. Hiding from the one who planted them.", dwell: 4600 },
        { he: "אתמול לא היה צורך בזה. אתמול לא היה ממה.", en: "Yesterday there was no need for this. Yesterday there was nothing to hide from.", dwell: 4800 }
      ]
    },

    ayeka: {
      call: { he: "אַיֶּכָּה", en: "Where art thou?" },
      answer: {
        he: "אֶת־קֹלְךָ שָׁמַעְתִּי בַּגָּן וָאִירָא כִּי־עֵירֹם אָנֹכִי וָאֵחָבֵא",
        en: "I heard thy voice in the garden, and I was afraid, because I was naked; and I hid myself."
      },
      narration: [
        { he: "הוא יודע איפה. השאלה אינה בשביל השואל. היא בשביל הנשאל.", en: "He knows where. The question is not for the asker. It is for the one asked.", dwell: 4800 },
        { he: "מילה אחת. ארבע אותיות. אלפי שנים אחר כך, על חורבן, ייפתח ספר באותן אותיות: איכה.", en: "One word. Four letters. Thousands of years later, over a ruin, a book will open with those same letters: Eikha — How.", dwell: 5600 },
        { he: "ואדם עונה על שאלה שלא נשאלה. 'פחדתי'. זו המילה הראשונה שלו מאז 'עצם מעצמי'.", en: "And the human answers a question that was not asked. 'I was afraid'. It is his first word since 'bone of my bones'.", dwell: 5600 }
      ]
    },

    blame: {
      exchanges: [
        {
          speaker: "god",
          he: "מִי הִגִּיד לְךָ כִּי עֵירֹם אָתָּה הֲמִן־הָעֵץ אֲשֶׁר צִוִּיתִיךָ לְבִלְתִּי אֲכָל־מִמֶּנּוּ אָכָלְתָּ׃",
          en: "Who told thee that thou wast naked? Hast thou eaten of the tree, whereof I commanded thee that thou shouldest not eat?"
        },
        {
          speaker: "adam",
          he: "הָאִשָּׁה אֲשֶׁר נָתַתָּה עִמָּדִי הִוא נָתְנָה־לִּי מִן־הָעֵץ וָאֹכֵל׃",
          en: "The woman whom thou gavest to be with me, she gave me of the tree, and I did eat."
        },
        {
          speaker: "god",
          he: "מַה־זֹּאת עָשִׂית׃",
          en: "What is this that thou hast done?"
        },
        {
          speaker: "eve",
          he: "הַנָּחָשׁ הִשִּׁיאַנִי וָאֹכֵל׃",
          en: "The serpent beguiled me, and I did eat."
        }
      ]
    },

    curses: [
      {
        who: "serpent",
        title: { he: "אֶל הַנָּחָשׁ", en: "To the Serpent" },
        verses: [
          {
            ref: "בראשית ג׳:י״ד",
            he: "וַיֹּאמֶר ה׳ אֱלֹהִים אֶל־הַנָּחָשׁ כִּי עָשִׂיתָ זֹּאת אָרוּר אַתָּה מִכָּל־הַבְּהֵמָה וּמִכֹּל חַיַּת הַשָּׂדֶה עַל־גְּחֹנְךָ תֵלֵךְ וְעָפָר תֹּאכַל כָּל־יְמֵי חַיֶּיךָ׃",
            en: "And the LORD God said unto the serpent, Because thou hast done this, cursed art thou above all cattle and above every beast of the field; upon thy belly shalt thou go, and dust shalt thou eat all the days of thy life."
          },
          {
            ref: "בראשית ג׳:ט״ו",
            he: "וְאֵיבָה אָשִׁית בֵּינְךָ וּבֵין הָאִשָּׁה וּבֵין זַרְעֲךָ וּבֵין זַרְעָהּ הוּא יְשׁוּפְךָ רֹאשׁ וְאַתָּה תְּשׁוּפֶנּוּ עָקֵב׃",
            en: "And I will put enmity between thee and the woman, and between thy seed and her seed; he shall bruise thy head, and thou shalt bruise his heel."
          }
        ],
        narration: [
          { he: "הוא לא נשאל. לא 'מה עשית'. לנחש אין מה לומר, ולא שואלים אותו.", en: "It is not questioned. No 'what hast thou done'. The serpent has nothing to say, and it is not asked.", dwell: 4800 },
          { he: "עפר תאכל. הוא הבטיח דעת, והוא מקבל עפר.", en: "Dust shalt thou eat. It promised knowledge, and it receives dust.", dwell: 4600 },
          { he: "איבה. בינך ובין האישה. הוא דיבר איתה מקרוב יותר מכולם, ומעכשיו — הרחוק מכולם.", en: "Enmity. Between thee and the woman. It spoke to her closer than anyone, and from now — farthest of all.", dwell: 5200 }
        ]
      },
      {
        who: "woman",
        title: { he: "אֶל הָאִשָּׁה", en: "To the Woman" },
        verses: [
          {
            ref: "בראשית ג׳:ט״ז",
            he: "אֶל־הָאִשָּׁה אָמַר הַרְבָּה אַרְבֶּה עִצְּבוֹנֵךְ וְהֵרֹנֵךְ בְּעֶצֶב תֵּלְדִי בָנִים וְאֶל־אִישֵׁךְ תְּשׁוּקָתֵךְ וְהוּא יִמְשָׁל־בָּךְ׃",
            en: "Unto the woman he said, I will greatly multiply thy pain and thy childbearing; in pain shalt thou bring forth children; and thy desire shall be to thy husband, and he shall rule over thee."
          }
        ],
        narration: [
          { he: "לא 'ארורה'. האישה לא מקוללת. האדמה מקוללת. הנחש מקולל. היא — לא.", en: "Not 'cursed'. The woman is not cursed. The ground is cursed. The serpent is cursed. She is not.", dwell: 5000 },
          { he: "עצב. אותה מילה תחזור אצלו: בעיצבון. הם מקבלים את אותו העצב, רק בשני מקומות שונים.", en: "Pain — etzev. The same word returns to him: itzavon. They receive the same pain, only in two different places.", dwell: 5200 },
          { he: "תשוקתך — והוא ימשול בך. מה שהיה שווה נעשה עקום. זה נאמר. לא נאמר שזה טוב.", en: "Thy desire — and he shall rule over thee. What was level is made crooked. It is said. It is not said that it is good.", dwell: 5600 }
        ]
      },
      {
        who: "man",
        title: { he: "אֶל הָאָדָם", en: "To the Man" },
        verses: [
          {
            ref: "בראשית ג׳:י״ז",
            he: "וּלְאָדָם אָמַר כִּי־שָׁמַעְתָּ לְקוֹל אִשְׁתֶּךָ וַתֹּאכַל מִן־הָעֵץ אֲשֶׁר צִוִּיתִיךָ לֵאמֹר לֹא תֹאכַל מִמֶּנּוּ אֲרוּרָה הָאֲדָמָה בַּעֲבוּרֶךָ בְּעִצָּבוֹן תֹּאכֲלֶנָּה כֹּל יְמֵי חַיֶּיךָ׃",
            en: "And unto the man he said, Because thou hast hearkened unto the voice of thy wife, and hast eaten of the tree of which I commanded thee, saying, Thou shalt not eat of it: cursed is the ground for thy sake; in toil shalt thou eat of it all the days of thy life."
          },
          {
            ref: "בראשית ג׳:י״ח",
            he: "וְקוֹץ וְדַרְדַּר תַּצְמִיחַ לָךְ וְאָכַלְתָּ אֶת־עֵשֶׂב הַשָּׂדֶה׃",
            en: "Thorns also and thistles shall it bring forth to thee; and thou shalt eat the herb of the field."
          },
          {
            ref: "בראשית ג׳:י״ט",
            he: "בְּזֵעַת אַפֶּיךָ תֹּאכַל לֶחֶם עַד שׁוּבְךָ אֶל־הָאֲדָמָה כִּי מִמֶּנָּה לֻקָּחְתָּ כִּי־עָפָר אַתָּה וְאֶל־עָפָר תָּשׁוּב׃",
            en: "In the sweat of thy face shalt thou eat bread, till thou return unto the ground; for out of it wast thou taken: for dust thou art, and unto dust shalt thou return."
          }
        ],
        narration: [
          { he: "כי שמעת לקול אשתך. אין עוול בלשמוע לה. העוול הוא שזה היה הקול היחיד ששמע.", en: "Because thou hast hearkened to the voice of thy wife. There is no wrong in listening to her. The wrong is that hers was the only voice he heard.", dwell: 5600 },
          { he: "האדמה ארורה בעבורו. הוא לא. אבל הוא יאכל אותה כל ימיו.", en: "The ground is cursed on his account. He is not. But he will eat of it all his days.", dwell: 4800 },
          { he: "עפר אתה. את זה הוא ידע. זה הדבר הראשון שהוא היה.", en: "Dust thou art. That he knew. It was the first thing he was.", dwell: 4600 },
          { he: "ואל עפר תשוב. את זה הוא לא ידע. עכשיו יש לזה שם. הנחש אמר שלא ימותו. הוא לא אמר מתי.", en: "And unto dust shalt thou return. That he did not know. Now it has a name. The serpent said they would not die. It did not say when.", dwell: 5800 }
        ]
      }
    ],

    naming: {
      verses: [
        {
          ref: "בראשית ג׳:כ׳",
          he: "וַיִּקְרָא הָאָדָם שֵׁם אִשְׁתּוֹ חַוָּה כִּי הִוא הָיְתָה אֵם כָּל־חָי׃",
          en: "And the human called his wife's name Eve; because she was the mother of all living."
        }
      ]
    },

    clothing: {
      verses: [
        {
          ref: "בראשית ג׳:כ״א",
          he: "וַיַּעַשׂ ה׳ אֱלֹהִים לְאָדָם וּלְאִשְׁתּוֹ כָּתְנוֹת עוֹר וַיַּלְבִּשֵׁם׃",
          en: "And the LORD God made for the man and for his wife garments of skin, and clothed them."
        }
      ],
      narration: [
        { he: "באמצע גזר הדין — מעשה.", en: "In the middle of the sentence — an act.", dwell: 4400 },
        { he: "לא מילה. לא ציווי. ידיים. הוא תופר להם.", en: "Not a word. Not a command. Hands. He sews for them.", dwell: 4800 },
        { he: "הם תפרו עלים. הוא תופר עור. שלהם ייבול עד הערב. שלו יחזיק.", en: "They sewed leaves. He sews skin. Theirs will wilt by evening. His will hold.", dwell: 5200 },
        { he: "וילבישם. מי שמגרש הוא מי שהלביש. זכור את זה בשער.", en: "And he clothed them. The one who banishes is the one who dressed them. Remember this at the gate.", dwell: 5600 }
      ]
    },

    exile: {
      verses: [
        {
          ref: "בראשית ג׳:כ״ב",
          he: "וַיֹּאמֶר ה׳ אֱלֹהִים הֵן הָאָדָם הָיָה כְּאַחַד מִמֶּנּוּ לָדַעַת טוֹב וָרָע וְעַתָּה פֶּן־יִשְׁלַח יָדוֹ וְלָקַח גַּם מֵעֵץ הַחַיִּים וְאָכַל וָחַי לְעֹלָם׃",
          en: "And the LORD God said, Behold, the human is become as one of us, to know good and evil; and now, lest he put forth his hand, and take also of the tree of life, and eat, and live for ever —"
        },
        {
          ref: "בראשית ג׳:כ״ג",
          he: "וַיְשַׁלְּחֵהוּ ה׳ אֱלֹהִים מִגַּן־עֵדֶן לַעֲבֹד אֶת־הָאֲדָמָה אֲשֶׁר לֻקַּח מִשָּׁם׃",
          en: "Therefore the LORD God sent him forth from the garden of Eden, to till the ground from whence he was taken."
        }
      ],
      narration: [
        { he: "לעבוד את האדמה אשר לוקח משם. הוא חוזר למקום שבא ממנו. זו לא ברכה.", en: "To till the ground from whence he was taken. He goes back to where he came from. It is not a blessing.", dwell: 5000 },
        { he: "וישלחהו. ואז, בפסוק הבא: ויגרש. פעמיים. כאילו הראשונה לא הספיקה. כאילו הוא לא הלך.", en: "He sent him forth. Then, in the next verse: he drove him out. Twice. As if the first did not suffice. As if he did not go.", dwell: 5600 },
        { he: "הם לא מביטים לאחור. או שכן. הכתוב לא אומר.", en: "They do not look back. Or they do. The text does not say.", dwell: 5200 }
      ]
    },

    final: {
      verses: [
        {
          ref: "בראשית ג׳:כ״ד",
          he: "וַיְגָרֶשׁ אֶת־הָאָדָם וַיַּשְׁכֵּן מִקֶּדֶם לְגַן־עֵדֶן אֶת־הַכְּרֻבִים וְאֵת לַהַט הַחֶרֶב הַמִּתְהַפֶּכֶת לִשְׁמֹר אֶת־דֶּרֶךְ עֵץ הַחַיִּים׃",
          en: "So he drove out the human; and he placed at the east of the garden of Eden the cherubim, and the flame of the whirling sword, to keep the way of the tree of life."
        }
      ],
      narration: [
        { he: "כרובים. להט חרב מתהפכת. הדבר הראשון בעולם שנשמר מפני אדם.", en: "Cherubim. A flame of a whirling sword. The first thing in the world guarded from a human.", dwell: 5200 },
        { he: "לא שומרים את הגן. שומרים את הדרך. את הדרך אל עץ החיים.", en: "It is not the garden they guard. It is the way. The way to the tree of life.", dwell: 5200 },
        { he: "מבחוץ רואים את השער. לא רואים את מה שאחריו.", en: "From outside, one sees the gate. One does not see what is beyond it.", dwell: 5400 },
        { he: "הם עומדים שם רגע. שניים. לפחות זה.", en: "They stand there a moment. Two. At least that.", dwell: 5800 },
        { he: "ואז הם הולכים, כי אין לאן ללכת חוץ מהלאה.", en: "Then they walk, because there is nowhere to go but onward.", dwell: 5600 },
        { he: "השער נשאר. הוא עדיין שם.", en: "The gate remains. It is still there.", dwell: 6400 }
      ]
    }
  },

  // ───────────────────────────────────────────────────────────────────────────
  // UI STRINGS
  // ───────────────────────────────────────────────────────────────────────────
  ui: {
    begin: { he: "התחל", en: "Begin" },
    continue: { he: "המשך", en: "Continue" },
    speak: { he: "דבר", en: "Speak" },
    hold: { he: "החזק", en: "Hold" },
    skip: { he: "דלג", en: "Skip" },
    translation: { he: "תרגום", en: "Translation" },
    sound: { he: "צליל", en: "Sound" },
    replay: { he: "שוב", en: "Replay" },
    chapterSelect: { he: "פרקים", en: "Chapters" },
    days: [
      { he: "אור", en: "Light" },
      { he: "רקיע", en: "Sky" },
      { he: "יבשה", en: "Land" },
      { he: "מאורות", en: "Lights" },
      { he: "דגה ועוף", en: "Fish and Fowl" },
      { he: "חיה ואדם", en: "Beasts and Man" },
      { he: "שבת", en: "Rest" }
    ],
    acts: [
      { he: "תוהו", en: "Tohu" },
      { he: "בריאה", en: "Creation" },
      { he: "עדן", en: "Eden" },
      { he: "חוה", en: "Eve" },
      { he: "נחש", en: "Serpent" },
      { he: "גירוש", en: "Exile" }
    ],
    epilogue: { he: "זה לא סוף הסיפור. זה רק סוף הגן.", en: "This is not the end of the story. It is only the end of the garden." }
  }
});
