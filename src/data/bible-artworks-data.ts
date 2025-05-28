import { BibleArtwork, Scripture } from "@/types/artwork";
import { Exodus_18v1_10v1, Exodus_1_1v22 } from "../../public/paintings/Exodus";
import { Genesis_1_1v31 } from "../../public/paintings/Genesis";

/**
 * Factory to build a Scripture object with a dynamic reference() method.
 */
function makeScripture(opts: {
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd?: number;
  chapterEnd?: number;
  text: string;
  theme?: string;
}): Scripture {
  const { book, chapter, verseStart, verseEnd, text, theme, chapterEnd } = opts;
  return {
    book,
    chapter,
    verseStart,
    verseEnd,
    chapterEnd,
    text,
    theme,
    reference() {
      if (chapterEnd && verseEnd) {
        if (chapterEnd === chapter) {
          return `${book} ${chapter}:${verseStart}-${verseEnd}`;
        }
        return `${book} ${chapter}:${verseStart}-${chapterEnd}:${verseEnd}`;
      }
      return `${book} ${chapter}:${verseStart}` +
        (verseEnd ? `-${verseEnd}` : "");
    },
  };
}

const bibleArtworks: BibleArtwork[] = [
  {
    id: crypto.randomUUID(),
    title: "Creation",
    year: "2023",
    imageUrl: Genesis_1_1v31,
    customFields: {
      "Biblical Period": "Beginning",
    },
    scripture: {
      en: makeScripture({
        book: "Genesis",
        chapter: 1,
        verseStart: 1,
        verseEnd: 31,
        text:
          "In the beginning God created the heaven and the earth. And the earth was without form, and void; and darkness was upon the face of the deep. And the Spirit of God moved upon the face of the waters. And God said, Let there be light: and there was light. And God saw the light, that it was good: and God divided the light from the darkness. And God called the light Day, and the darkness he called Night. And the evening and the morning were the first day. And God said, Let there be a firmament in the midst of the waters, and let it divide the waters from the waters. And God made the firmament, and divided the waters which were under the firmament from the waters which were above the firmament: and it was so. And God called the firmament Heaven. And the evening and the morning were the second day. And God said, Let the waters under the heaven be gathered together unto one place, and let the dry land appear: and it was so. And God called the dry land Earth; and the gathering together of the waters called he Seas: and God saw that it was good. And God said, Let the earth bring forth grass, the herb yielding seed, and the fruit tree yielding fruit after his kind, whose seed is in itself, upon the earth: and it was so. And the earth brought forth grass, and herb yielding seed after his kind, and the tree yielding fruit, whose seed was in itself, after his kind: and God saw that it was good. And the evening and the morning were the third day. And God said, Let there be lights in the firmament of the heaven to divide the day from the night; and let them be for signs, and for seasons, and for days, and years: and let them be for lights in the firmament of the heaven to give light upon the earth: and it was so. And God made two great lights; the greater light to rule the day, and the lesser light to rule the night: he made the stars also. And God set them in the firmament of the heaven to give light upon the earth, and to rule over the day and over the night, and to divide the light from the darkness: and God saw that it was good. And the evening and the morning were the fourth day. And God said, Let the waters bring forth abundantly the moving creature that hath life, and fowl that may fly above the earth in the open firmament of heaven. And God created great whales, and every living creature that moveth, which the waters brought forth abundantly, after their kind, and every winged fowl after his kind: and God saw that it was good. And God blessed them, saying, Be fruitful, and multiply, and fill the waters in the seas, and let fowl multiply in the earth. And the evening and the morning were the fifth day. And God said, Let the earth bring forth the living creature after his kind, cattle, and creeping thing, and beast of the earth after his kind: and it was so. And God made the beast of the earth after his kind, and cattle after their kind, and every thing that creepeth upon the earth after his kind: and God saw that it was good. And God said, Let us make man in our image, after our likeness: and let them have dominion over the fish of the sea, and over the fowl of the air, and over the cattle, and over all the earth, and over every creeping thing that creepeth upon the earth. So God created man in his own image, in the image of God created he him; male and female created he them. And God blessed them, and God said unto them, Be fruitful, and multiply, and replenish the earth, and subdue it: and have dominion over the fish of the sea, and over the fowl of the air, and over every living thing that moveth upon the earth. And God said, Behold, I have given you every herb bearing seed, which is upon the face of all the earth, and every tree, in the which is the fruit of a tree yielding seed; to you it shall be for meat. And to every beast of the earth, and to every fowl of the air, and to every thing that creepeth upon the earth, wherein there is life, I have given every green herb for meat: and it was so. And God saw every thing that he had made, and, behold, it was very good. And the evening and the morning were the sixth day.",
        theme: "Creation",
      }),
      zh: makeScripture({
        book: "創世記",
        chapter: 1,
        verseStart: 1,
        verseEnd: 31,
        text:
          "起初，神創造天地。地是空虛混沌，淵面黑暗；神的靈運行在水面上。神說：要有光，就有了光。神看光是好的，就把光暗分開了。神稱光為晝，稱暗為夜。有晚上，有早晨，這是頭一日。神說：諸水之間要有空氣，將水分為上下。神就造出空氣，將空氣以下的水、空氣以上的水分開了。事就這樣成了。神稱空氣為天。有晚上，有早晨，是第二日。神說：天下的水要聚在一處，使旱地露出來。事就這樣成了。神稱旱地為地，稱水的聚處為海。神看著是好的。神說：地要發生青草和結種子的菜蔬，並結果子的樹木，各從其類，果子都包著核。事就這樣成了。於是地發生了青草和結種子的菜蔬，各從其類；並結果子的樹木，各從其類；果子都包著核。神看著是好的。有晚上，有早晨，是第三日。神說：天上要有光體，可以分晝夜，作記號，定節令、日子、年歲，並要發光在天空，普照在地上。事就這樣成了。於是神造了兩個大光，大的管晝，小的管夜，又造眾星，就把這些光擺列在天空，普照在地上，管理晝夜，分別明暗。神看著是好的。有晚上，有早晨，是第四日。神說：水要多多滋生有生命的物；要有雀鳥飛在地面以上，天空之中。神就造出大魚和水中所滋生各樣有生命的動物，各從其類；又造出各樣飛鳥，各從其類。神看著是好的。神就賜福給這一切，說：滋生繁多，充滿海中的水；雀鳥也要多生在地上。有晚上，有早晨，是第五日。神說：地要生出活物來，各從其類；牲畜、昆蟲、地上的野獸，各從其類。事就這樣成了。於是神造出野獸，各從其類；牲畜，各從其類；地上一切昆蟲，各從其類。神看著是好的。神說：我們要照著我們的形像、按著我們的樣式造人，使他們管理海裡的魚、空中的鳥、地上的牲畜，和全地，並地上所爬的一切昆蟲。神就照著自己的形像造人，乃是照著他的形像造男造女。神就賜福給他們，又對他們說：要生養眾多，遍滿地面，治理這地，也要管理海裡的魚、空中的鳥，和地上各樣行動的活物。神說：看哪，我將遍地上一切結種子的菜蔬和一切樹上所結有核的果子全賜給你們作食物。至於地上的走獸和空中的飛鳥，並各樣爬在地上有生命的物，我將青草賜給他們作食物。事就這樣成了。神看著一切所造的都甚好。有晚上，有早晨，是第六日。",
        theme: "創造",
      }),
    },
  },
  {
    id: crypto.randomUUID(),
    title: "Salvation",
    description: "A visual meditation on God's love and the gift of salvation.",
    year: "2023",
    imageUrl: Exodus_1_1v22,
    customFields: {
      "Biblical Period": "New Testament",
    },
    scripture: {
      en: makeScripture({
        book: "Genesis",
        chapter: 3,
        verseStart: 16,
        text:
          "For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.",
        theme: "Salvation",
      }),
      zh: makeScripture({
        book: "創世記",
        chapter: 3,
        verseStart: 16,
        text: "",
        theme: "救恩",
      }),
    },
  },
  {
    id: crypto.randomUUID(),
    title: "Guidance",
    description:
      "An exploration of God's guidance and provision as described in Psalm 23.",
    year: "2023",
    medium: "Digital Art",
    imageUrl: Exodus_1_1v22,
    customFields: {
      "Biblical Period": "Old Testament",
    },
    scripture: {
      en: makeScripture({
        book: "Exodus",
        chapter: 1,
        verseStart: 1,
        verseEnd: 22,
        text:
          "Now these are the names of the children of Israel, which came into Egypt; every man and his household came with Jacob. Reuben, Simeon, Levi, and Judah, Issachar, Zebulun, and Benjamin, Dan, and Naphtali, Gad, and Asher. And all the souls that came out of the loins of Jacob were seventy souls: for Joseph was in Egypt already. And Joseph died, and all his brethren, and all that generation. And the children of Israel were fruitful, and increased abundantly, and multiplied, and waxed exceeding mighty; and the land was filled with them. Now there arose up a new king over Egypt, which knew not Joseph. And he said unto his people, Behold, the people of the children of Israel are more and mightier than we: Come on, let us deal wisely with them; lest they multiply, and it come to pass, that, when there falleth out any war, they join also unto our enemies, and fight against us, and so get them up out of the land. Therefore they did set over them taskmasters to afflict them with their burdens. And they built for Pharaoh treasure cities, Pithom and Raamses. But the more they afflicted them, the more they multiplied and grew. And they were grieved because of the children of Israel. And the Egyptians made the children of Israel to serve with rigour: And they made their lives bitter with hard bondage, in morter, and in brick, and in all manner of service in the field: all their service, wherein they made them serve, was with rigour. And the king of Egypt spake to the Hebrew midwives, of which the name of the one was Shiphrah, and the name of the other Puah: And he said, When ye do the office of a midwife to the Hebrew women, and see them upon the stools; if it be a son, then ye shall kill him: but if it be a daughter, then she shall live. But the midwives feared God, and did not as the king of Egypt commanded them, but saved the men children alive. And the king of Egypt called for the midwives, and said unto them, Why have ye done this thing, and have saved the men children alive? And the midwives said unto Pharaoh, Because the Hebrew women are not as the Egyptian women; for they are lively, and are delivered ere the midwives come in unto them. Therefore God dealt well with the midwives: and the people multiplied, and waxed very mighty. And it came to pass, because the midwives feared God, that he made them houses. And Pharaoh charged all his people, saying, Every son that is born ye shall cast into the river, and every daughter ye shall save alive.",
        theme: "Guidance",
      }),
      zh: makeScripture({
        book: "出埃及記",
        chapter: 1,
        verseStart: 1,
        verseEnd: 22,
        text:
          "以色列的众子，各带家眷，和雅各一同来到埃及。他们的名字记在下面。流便、西缅、利未、犹大、以萨迦、西布伦、便雅悯、但、拿弗他利、迦得、亚设。凡从雅各而生的，共有七十人；约瑟已经在埃及。约瑟和他的弟兄，并那一代的人，都死了。以色列人生养众多，并且繁茂，极其强盛，满了那地。有不认识约瑟的新王起来，治理埃及，对他的百姓说：看哪，这以色列民比我们还多，又比我们强盛。来罢，我们不如用巧计待他们，恐怕他们多起来，日后若遇什么争战的事，就连合我们的仇敌攻击我们，离开这地去了。于是埃及人派督工的辖制他们，加重担苦害他们。他们为法老建造两座积货城，就是比东和兰塞。只是越发苦害他们，他们越发多起来，越发蔓延；埃及人就因以色列人愁烦。埃及人严严的使以色列人做工，使他们因做苦工觉得命苦；无论是和泥、是作砖、是作田间各样的工，在一切的工上都严严的待他们。有希伯来的两个收生婆，一名施弗拉，一名普阿；埃及王对他们说：你们为希伯来妇人收生，看他们临盆的时候，若是男孩，就把他杀了；若是女孩，就留他存活。但是收生婆敬畏神，不照埃及王的吩咐行，竟存留男孩的性命。埃及王召了收生婆来，说：你们为什么做这事，存留男孩的性命呢？收生婆对法老说：因为希伯来妇人与埃及妇人不同；希伯来妇人本是健壮的（原文作活泼的），收生婆还没有到，他们已经生产了。神厚待收生婆。以色列人多起来，极其强盛。收生婆因为敬畏神，神便叫他们成立家室。法老吩咐他的众民说：以色列人所生的男孩，你们都要丢在河里；一切的女孩，你们要存留她的性命。",
        theme: "引導",
      }),
    },
  },
  {
    id: crypto.randomUUID(),
    title: "The Good Shepherd",
    description:
      "An exploration of God's guidance and provision as described in Psalm 23.",
    year: "2023",
    imageUrl: Exodus_18v1_10v1,
    customFields: {
      "Biblical Period": "Old Testament",
    },
    scripture: {
      en: makeScripture({
        book: "Exodus",
        chapter: 18,
        verseStart: 1,
        verseEnd: 27,
        text:
          "When Jethro, the priest of Midian, Moses’ father-in-law, heard of all that God had done for Moses and for Israel his people, and that the Lord had brought Israel out of Egypt; then Jethro took Zipporah, Moses’ wife, after he had sent her back, and her two sons; of whom the name of the one was Gershom, for he said, ‘I have been an alien in a strange land’; and the name of the other was Eliezer, for the God of my father was my help and delivered me from the sword of Pharaoh. And Jethro came with his sons and his wife unto Moses into the wilderness, where he encamped at the mount of God. And he said unto Moses, ‘I, your father-in-law Jethro, am come unto you, and to your wife, and to her two sons with her.’ And Moses went out to meet his father-in-law, and did obeisance, and kissed him; and they inquired of each other’s welfare, and they came into the tent. And Moses told his father-in-law all that the Lord had done unto Pharaoh and to the Egyptians for Israel’s sake, and all the travail that had come upon them by the way, and how the Lord delivered them. And Jethro rejoiced for all the goodness which the Lord had done to Israel, whom he had delivered out of the hand of the Egyptians. And Jethro said, ‘Blessed be the Lord, who has delivered you out of the hand of the Egyptians, and out of the hand of Pharaoh, who has delivered the people from under the hand of the Egyptians. Now I know that the Lord is greater than all gods: for in the thing wherein they dealt proudly He was above them.’ And Jethro took a burnt offering and sacrifices for God: and Aaron came, and all the elders of Israel, to eat bread with Jethro before God. And it came to pass on the morrow, that Moses sat to judge the people: and the people stood by Moses from the morning unto the evening. And when Jethro saw all that he did to the people, he said, ‘What is this thing that you do to the people? Why do you sit alone, and all the people stand by you from morning unto evening?’ And Moses said unto his father-in-law, ‘Because the people come unto me to inquire of God: when they have a matter, they come unto me; and I judge between one and another, and make them know the statutes of God and His laws.’ And Jethro said unto him, ‘The thing that you do is not good. You will surely wear away, both you and this people that is with you: for this thing is too heavy for you; you are not able to perform it yourself alone. Hearken now unto my voice; I will give you counsel, and God shall be with you: be you for the people to God-ward, that you may bring the causes unto God. And you shall teach them ordinances and laws, and shall show them the way wherein they must walk, and the work that they must do. Moreover you shall provide out of all the people able men, such as fear God, men of truth, hating covetousness; and place such over them, to be rulers of thousands, rulers of hundreds, rulers of fifties, and rulers of tens. And let them judge the people at all seasons: and it shall be, that every great matter they shall bring unto you, but every small matter they shall judge themselves; so shall it be easier for yourself, and they shall bear the burden with you. If you shall do this thing, and God command you so, then you shall be able to endure, and all this people shall also go to their place in peace.’ So Moses hearkened to the voice of his father-in-law, and did all that he had said. And Moses chose able men out of all Israel, and made them heads over the people, rulers of thousands, rulers of hundreds, rulers of fifties, and rulers of tens. And they judged the people at all seasons: the hard causes they brought unto Moses, but every small matter they judged themselves. And Moses let his father-in-law depart; and he went his way into his own land.",
        theme: "Guidance",
      }),
      zh: makeScripture({
        book: "出埃及記",
        chapter: 18,
        verseStart: 1,
        verseEnd: 27,
        text:
          "摩西的岳父，米甸祭司葉忒羅，聽見神為摩西和神的百姓以色列所行的一切事，就是耶和華將以色列從埃及領出來的事，便帶著摩西的妻子西坡拉，就是摩西從前打發回去的，又帶著西坡拉的兩個兒子，一個名叫革舜，因為摩西說：‘我在外邦作了寄居的；’一個名叫以利以謝，因為他說：‘我父親的神幫助了我，救我脫離法老的刀。’摩西的岳父葉忒羅帶著摩西的妻子和兩個兒子來到神的山，就是摩西在曠野安營的地方。他對摩西說：‘我是你岳父葉忒羅，帶著你的妻子和兩個兒子來到你這裡。’摩西迎接他的岳父，向他下拜，與他親嘴，彼此問安，都進了帳棚。摩西將耶和華為以色列的緣故向法老和埃及人所行的一切事，以及路上所遭遇的一切艱難，並耶和華怎樣搭救他們，都述說與他岳父聽。葉忒羅因耶和華待以色列的一切好處，就是拯救他們脫離埃及人的手，便甚歡喜。葉忒羅說：‘耶和華是應當稱頌的；他救了你們脫離埃及人和法老的手，將這百姓從埃及人的手下救出來。現在在埃及人向這百姓發狂傲的事上得知，耶和華比萬神都大。’摩西的岳父葉忒羅把燔祭和平安祭獻給神。亞倫和以色列的眾長老都來了，與摩西的岳父在神面前吃飯。第二天，摩西坐著審判百姓，百姓從早到晚都站在摩西的左右。摩西的岳父看見他向百姓所做的一切事，就說：‘你向百姓做的是什麼事呢？你為什麼獨自坐著，眾百姓從早到晚都站在你的左右呢？’摩西對岳父說：‘這是因百姓到我這裡來求問神。他們有事的時候就到我這裡來，我便在兩造之間施行審判；我又叫他們知道神的律例和法度。’摩西的岳父說：‘你這做的不好。你和這些百姓必都疲憊；因為這事太重，你獨自一人辦理不了。現在你要聽我的話。我為你出個主意，願神與你同在。你要替百姓到神面前，將案件奏告神；又要將律例和法度教訓他們，指示他們當行的道，當做的事；並要從百姓中揀選有才能的人，就是敬畏神、誠實無妄、恨不義之財的人，派他們作千夫長、百夫長、五十夫長、十夫長，管理百姓，叫他們隨時審判百姓，大事都要呈到你這裡，小事他們自己可以審判。這樣，你就輕省些，他們也可以同當此任。’你若這樣行，神也這樣吩咐你，你就能受得住，這百姓也都平平安安歸回他們的住處。於是，摩西聽從他岳父的話，按著他所說的去行。摩西從以色列人中揀選了有才能的人，立他們為百姓的首領，作千夫長、百夫長、五十夫長、十夫長。他們隨時審判百姓，有難斷的案件就呈到摩西那裡，但各樣小事他們自己審判。此後，摩西讓他的岳父去，他就往本地去了。",
        theme: "引導",
      }),
    },
  },
];

export default bibleArtworks;
