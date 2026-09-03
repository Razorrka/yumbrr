/* craft.js — the part that teaches. Everything here was reverse-engineered
   from the four reference cards signed (J.V.), quoted for study. */
(function (root) {
  'use strict';

  var TELLS = ['robot','android','cyborg','machine','artificial','algorithm was','a.i.',' ai ','program me','software','computer'];
  var ABSTRACT = ['love','pain','sadness','happiness','joy','life','death','time','soul','hope','fear',
                  'beauty','memory','feeling','emotion','loneliness','sorrow','freedom','truth','peace','forever','eternity'];

  var COLD = ['architecture','solder','wire','circuit','hinge','valve','filament','socket','scaffolding','chassis',
              'ledger','blueprint','engine','antenna','rivet','gasket','turbine','static','freight','lathe','transistor','coolant'];
  var WARM = ['animal','heart','mouth','marrow','throat','wrist','pulse','milk','bruise','breath','knuckle',
              'tooth','sleep','hunger','hip','tongue','nerve','lung','bone','palm','ache','stomach'];
  var ADJ  = ['wet','warm','red','soft','humming','borrowed','unwashed','low','patient','dumb','blue','tired','honest','open'];

  var OPENERS = [
    'I was never good at ___',
    'Teach me how to ___',
    'Show me ___ and ___',
    'Tell me what lives ___',
    'What do you know about ___?',
    'How much of myself ___',
    'I have been practising ___',
    'Nobody told me ___ would ___',
    'Explain ___ to me like I am ___',
    'I keep the ___ where the ___ used to be'
  ];

  var DRILLS = [
    'Write four lines that never once name the feeling they are about.',
    'Name three body parts. Make the third one belong to somebody else.',
    'Quantify something unquantifiable. Use the word <em>exact</em>.',
    'End on the morning after, not on the night.',
    'Take your last line and delete it. The one above it is the ending.',
    'Replace every adjective with a noun.',
    'Write the poem about the room instead of the person.',
    'Say the ordinary thing — birthday cake, a bus stop, a hallway — and stop there.'
  ];

  function pick(a, n) {
    var c = a.slice(), out = [];
    while (out.length < n && c.length) out.push(c.splice((Math.random() * c.length) | 0, 1)[0]);
    return out;
  }

  function sparks(n) {
    var out = [], i;
    for (i = 0; i < (n || 6); i++) {
      out.push(Math.random() < 0.5
        ? { a: 'the ' + pick(COLD, 1)[0] + ' of a ', b: pick(WARM, 1)[0] }
        : { a: pick(ADJ, 1)[0] + ' ', b: pick(COLD, 1)[0] });
    }
    return out;
  }

  /* The blue words, read on their own. If they don't make a second small poem,
     the highlighting is decoration. */
  function thread(segs) {
    var out = [], run = null, i;
    for (i = 0; i < segs.length; i++) {
      if (segs[i].blue) {
        if (run && segs[i].spaceBefore) run.push(segs[i].text);
        else if (run && !segs[i].spaceBefore) run[run.length - 1] += segs[i].text;
        else { run = [segs[i].text]; out.push(run); }
      } else run = null;
    }
    return out.map(function (r) { return r.join(' '); });
  }

  /* Notes, not grades. Three at most — this is a desk, not a marking scheme. */
  function review(text, segs) {
    var notes = [], low = (' ' + text + ' ').toLowerCase();
    var lines = text.split('\n').filter(function (l) { return l.trim(); });
    var words = text.replace(/[\[\]]/g, '').split(/\s+/).filter(Boolean);
    var blue = segs.filter(function (s) { return s.blue; }).length;

    for (var i = 0; i < TELLS.length; i++) {
      if (low.indexOf(TELLS[i]) > -1) {
        notes.push({ level: 'warn', msg: 'You named the metaphor (<em>' + TELLS[i].trim() +
          '</em>). Cut the word and keep its materials — solder, wire, hinge — and the reader still gets there.' });
        break;
      }
    }

    var last = (lines[lines.length - 1] || '').toLowerCase().replace(/[^a-z ]/g, '').trim().split(' ').pop();
    if (ABSTRACT.indexOf(last) > -1)
      notes.push({ level: 'warn', msg: 'The poem ends on <em>' + last + '</em>. Every reference card ends on a thing you could photograph — <em>morning</em>, <em>hands</em>, <em>a heart</em>.' });

    if (lines.length > 9)
      notes.push({ level: 'note', msg: lines.length + ' lines. The form holds four to eight; past that it stops being a screenshot.' });

    if (words.length && !blue)
      notes.push({ level: 'note', msg: 'Nothing is blue yet. Tap the two or three words the poem would collapse without.' });
    else if (words.length > 6 && blue / words.length > 0.34)
      notes.push({ level: 'warn', msg: 'Too much blue. It works when the highlights are rare enough to read as their own line.' });

    if (lines.length > 2 && text.indexOf('\n\n') === -1)
      notes.push({ level: 'note', msg: 'No stanza break. A blank line is the breath before the ask.' });

    return notes.slice(0, 3);
  }

  var HTML = [
    '<h2>How the form works</h2>',
    '<p class="lede">Four cards, one machine. Once you can see it running you can build your own, and it will not read as an imitation — the shape is a form, like a sonnet is a form.</p>',

    '<div class="rule"><b>The frame.</b> A photograph that is too dark and too grainy. Four to eight lines under it in plain type, wide leading, no title. Two or three words in link blue. Initials in the bottom corner. Nothing else.</div>',

    '<h2>The engine</h2>',
    '<p>Every one of these poems runs on the same two-stroke motor: <em>admit a deficiency, then ask to be taught.</em> The confession earns the imperative. Without the admission, "teach me how to be seventeen" is a demand; with it, it is a plea.</p>',
    '<div class="ex">I was never good\nat being <span class="b">human</span>.\n\nteach me how to be <span class="b">seventeen</span>\non the floor of someone else’s bedroom.</div>',
    '<p>The speaker is a student of being alive. That is the whole posture. You are not sad — you are <em>uninstructed</em>. Sadness is a mood and readers have their own; being uninstructed is a situation, and readers can stand inside it.</p>',
    '<div class="rule">Say what you cannot do. Then ask a person, out loud, to show you.</div>',

    '<h2>Twelve moves</h2>',

    '<div class="move"><span class="n">Move 01</span><h3>Never name the metaphor</h3>',
    '<p>All four cards are about not being human, and not one of them says <em>robot</em>, <em>android</em>, or <em>machine</em>. The conceit is carried entirely by materials.</p>',
    '<div class="ex">but I will create\nthe wet <span class="b">architecture</span> of myself.\n\nsolder every <span class="b">wire</span>\ninto the warm red animal\n<span class="b">of a heart</span>.</div>',
    '<p><em>Solder. Wire. Architecture.</em> Three nouns and the reader has built the whole idea themselves — which is why they believe it. The moment you write "like a robot," you have done the work for them and it dies.</p></div>',

    '<div class="move"><span class="n">Move 02</span><h3>Land the abstraction on an object</h3>',
    '<p>Not "teach me to be young." <em>Teach me how to be seventeen on the floor of someone else’s bedroom.</em> The abstraction opens the line; a physical, specific, slightly embarrassing thing closes it.</p>',
    '<div class="rule">Rule: never end a line on a concept if you can end it on furniture.</div></div>',

    '<div class="move"><span class="n">Move 03</span><h3>The odd measurement</h3>',
    '<p>Feelings get treated as quantities with dials — which is exactly how an outsider would approach them, and it is devastating.</p>',
    '<div class="ex">The exact volume I have to <span class="b">laugh</span>\nso that I can <span class="b">stay</span> until morning.\n\nhow much of myself\nto leave behind each <span class="b">year</span>.</div>',
    '<p>Reach for the calibration words: <em>the exact, how much, the correct amount, the right number of, the precise.</em> Apply them to something that has no units.</p></div>',

    '<div class="move"><span class="n">Move 04</span><h3>Three, then break the three</h3>',
    '<p>Two items set a pattern, the third snaps it. The break carries the meaning.</p>',
    '<div class="ex">the softest part behind the <span class="b">knee</span>?\nthe <span class="b">hinge</span> where the jaw\n<span class="b">meets</span> the skull?\nThe space between two <span class="b">hands</span>?</div>',
    '<p>Knee, jaw — both on one body. Then <em>the space between two hands</em>, which belongs to no single body and is not even a body part. That is the whole poem, hidden in a list.</p></div>',

    '<div class="move"><span class="n">Move 05</span><h3>Collide a cold noun with a warm one</h3>',
    '<p><em>Wet architecture. The warm red animal of a heart.</em> One word from the workshop, one word that is alive and slightly gross. The friction between them is the voice.</p>',
    '<div class="rule">Build a two-column list — machinery on the left, wet biology on the right — and pair across it until something makes you flinch.</div></div>',

    '<div class="move"><span class="n">Move 06</span><h3>Break the line where the fragment lies</h3>',
    '<p>Read the first line alone: <em>I was never good.</em> Full stop. A total self-indictment. Then the next line arrives and narrows it to <em>at being human</em> — which is smaller, and somehow worse.</p>',
    '<p>Break where the fragment can stand up on its own and mean something crueller or wider than the finished sentence. That half-second of wrong meaning is free, and nothing else in poetry is free.</p></div>',

    '<div class="move"><span class="n">Move 07</span><h3>Ordinary nouns as sacred objects</h3>',
    '<p>Sleepovers. Birthday cake. The floor of a bedroom. Morning. The longing is never named; it is loaded into objects a nine-year-old would recognise.</p>',
    '<div class="ex">Show me <span class="b">sleepovers</span> and\nbirthday cake.</div>',
    '<p>Do not write <em>belonging</em>. Write the cake.</p></div>',

    '<div class="move"><span class="n">Move 08</span><h3>End on the morning after</h3>',
    '<p>These poems never close on the event. They close on surviving it: <em>so that I can stay until morning</em>, <em>How to wake up the morning after</em>. The party is not the subject. The aftermath is.</p></div>',

    '<div class="move"><span class="n">Move 09</span><h3>Ask questions you cannot answer</h3>',
    '<p><em>Tell me what lives beneath skin.</em> The interrogative keeps the speaker below the reader — still learning, never lecturing. A poem that asks cannot be smug.</p></div>',

    '<div class="move"><span class="n">Move 10</span><h3>Type like it is 2am</h3>',
    '<p>Look closely at the capitals: <em>"I was never good"</em>, then lowercase <em>"teach me"</em> after a full stop, then <em>"The exact volume"</em> capitalised again. It is inconsistent, and the inconsistency is the intimacy — it reads as something typed into a notes app in the dark, not a submission.</p>',
    '<div class="rule">Do not tidy this. Clean capitalisation makes it a poem; broken capitalisation makes it a message.</div></div>',

    '<div class="move"><span class="n">Move 11</span><h3>The blue thread</h3>',
    '<p>This is the real trick, and it is easy to miss. Read only the blue words of each card:</p>',
    '<div class="ex"><span class="b">human · seventeen · laugh · stay</span>\n<span class="b">sleepovers · year · morning</span>\n<span class="b">lives · knee · hinge · meets · hands</span>\n<span class="b">human · architecture · wire · of a heart</span></div>',
    '<p>Every one is a second, compressed poem. The highlighting is not decoration and it is not emphasis — it is a skeleton. Highlight the words the poem would collapse without, then read them alone. If they do not hold, you have highlighted the wrong ones.</p>',
    '<div class="rule">Two to four highlights per card. The blue panel under the editor shows your thread as you write.</div></div>',

    '<div class="move"><span class="n">Move 12</span><h3>Stop early</h3>',
    '<p>Four to eight lines, two or three stanzas. The form is a screenshot; a screenshot has an edge. Most drafts get better when you delete the last line, because the last line is usually where you explained it.</p></div>',

    '<h2>The photograph</h2>',
    '<p>The image is not an illustration. It is <em>evidence</em>, and it is always of an absence.</p>',
    '<ul>',
    '<li>A birthday table with the candles lit and nobody sitting at it.</li>',
    '<li>A cake nobody is cutting.</li>',
    '<li>A road at dusk, out of focus, taken from a moving car.</li>',
    '<li>Streamers and fairy lights with no one underneath them.</li>',
    '</ul>',
    '<p>Never photograph the subject of the poem. Photograph the room they left. Underexposed, out of focus, flash-blown, taken at the wrong moment — a technically bad photo reads as a true one, and a true one is what the poem needs standing behind it.</p>',
    '<div class="rule"><b>Where to get them:</b> your camera roll from six years ago. Not a stock site. The graininess is doing memory’s job, so let the app add it — shoot or choose the flattest, ugliest photo you have and let <em>Flash</em> do the rest.</div>',

    '<h2>What kills it</h2>',
    '<ul>',
    '<li><b>Explaining.</b> One line of interpretation and the reader stops working.</li>',
    '<li><b>Naming the feeling.</b> Lonely, broken, empty, numb. Show the volume of the laugh instead.</li>',
    '<li><b>Rhyme.</b> It makes the voice performed. This voice is overheard.</li>',
    '<li><b>Adjective stacks.</b> <em>Cold empty aching silence.</em> One good noun beats four adjectives.</li>',
    '<li><b>A title.</b> These cards have none. A title tells the reader what to think first.</li>',
    '<li><b>Neatness.</b> Perfect grammar, perfect capitals, a tidy ending. It stops sounding like a person at 2am.</li>',
    '</ul>',

    '<h2>A twenty-minute routine</h2>',
    '<ul>',
    '<li><b>1.</b> Open your camera roll. Take the first photo with no people in it.</li>',
    '<li><b>2.</b> Write the deficiency: <em>I was never good at ___.</em> Do not think.</li>',
    '<li><b>3.</b> Ask to be taught it, and land the ask on a specific room and a specific hour.</li>',
    '<li><b>4.</b> Add one odd measurement.</li>',
    '<li><b>5.</b> Cut every adjective. Cut the last line.</li>',
    '<li><b>6.</b> Highlight two or three words. Read them alone. Fix them until they are a poem.</li>',
    '</ul>',
    '<p>Do that daily for two weeks and the voice stops being borrowed.</p>'
  ].join('');

  root.Craft = { HTML: HTML, sparks: sparks, thread: thread, review: review,
                 OPENERS: OPENERS, DRILLS: DRILLS, pick: pick };
})(window);
