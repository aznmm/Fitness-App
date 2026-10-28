export interface Guide {
  steps: string[];
  cues: string[];
}

const g = (steps: string[], cues: string[]): Guide => ({ steps, cues });

/** How-to steps and form cues for every built-in exercise. */
export const GUIDES: Record<string, Guide> = {
  // Chest
  'bench-press': g(
    ['Lie on the bench with your eyes under the bar and feet flat on the floor.', 'Grip slightly wider than shoulder width, unrack, and lower the bar to your mid-chest.', 'Press up and slightly back until your arms are straight over your shoulders.'],
    ['Pull your shoulder blades together and down before you unrack.', 'Keep your elbows about 45–70° from your body, not flared straight out.', 'Touch the chest lightly. Don\'t bounce.'],
  ),
  'incline-bench-press': g(
    ['Set the bench to 30–45° and lie back with your eyes under the bar.', 'Unrack and lower the bar to your upper chest, just below the collarbones.', 'Press straight up until your arms are locked out.'],
    ['Keep your shoulder blades pinned to the bench.', 'Don\'t let your hips lift off the seat.', 'A lower incline (30°) keeps the focus on the chest.'],
  ),
  'decline-bench-press': g(
    ['Hook your legs under the pads and lie back on the decline bench.', 'Unrack with a shoulder-width grip and lower the bar to your lower chest.', 'Press back up over your chest.'],
    ['Use a spotter or safeties: re-racking is awkward on a decline.', 'Control the descent; the range of motion is short.'],
  ),
  'db-bench-press': g(
    ['Sit with the dumbbells on your thighs, then lie back and kick them up to chest level.', 'Press the dumbbells up until your arms are straight, palms facing forward.', 'Lower under control until your elbows are just below the bench.'],
    ['Let the dumbbells travel slightly together at the top. Don\'t clang them.', 'Keep your shoulder blades squeezed back the whole time.'],
  ),
  'incline-db-press': g(
    ['Set the bench to 30–45°, lie back and bring the dumbbells to your shoulders.', 'Press up and slightly in until your arms are straight.', 'Lower slowly to the sides of your upper chest.'],
    ['Keep your wrists stacked over your elbows.', 'Avoid arching your lower back off the bench.'],
  ),
  'chest-press-machine': g(
    ['Adjust the seat so the handles line up with your mid-chest.', 'Press the handles forward until your arms are almost straight.', 'Return slowly until you feel a stretch across your chest.'],
    ['Keep your back and head against the pad.', 'Don\'t let the weight stack touch between reps.'],
  ),
  'cable-fly': g(
    ['Set the pulleys at shoulder height, grab a handle in each hand and step forward.', 'With a slight bend in your elbows, bring your hands together in front of your chest.', 'Open back up slowly until you feel a stretch across your chest.'],
    ['Think "hug a tree": the elbow angle stays fixed.', 'Lean slightly forward with a staggered stance for balance.'],
  ),
  'db-fly': g(
    ['Lie on a flat bench holding dumbbells above your chest, palms facing each other.', 'With a soft bend in the elbows, lower the weights out to your sides.', 'Squeeze them back up along the same arc.'],
    ['Stop when your upper arms are level with the bench.', 'Use lighter weight than for presses. This is a stretch movement.'],
  ),
  'pec-deck': g(
    ['Adjust the seat so the handles are at chest height.', 'With elbows slightly bent, bring the handles together in front of you.', 'Let them open slowly until you feel a chest stretch.'],
    ['Keep your shoulders down and back against the pad.', 'Pause and squeeze at the front for a second.'],
  ),
  'push-up': g(
    ['Start in a high plank with your hands slightly wider than your shoulders.', 'Lower your chest to just above the floor.', 'Push back up until your arms are straight.'],
    ['Keep a straight line from head to heels. Don\'t let your hips sag.', 'Tuck your elbows to about 45° from your body.', 'Too hard? Put your hands on a bench. Too easy? Elevate your feet.'],
  ),
  dip: g(
    ['Support yourself on the bars with straight arms.', 'Lean slightly forward and lower until your shoulders are just below your elbows.', 'Press back up to straight arms.'],
    ['Leaning forward targets the chest; staying upright targets the triceps.', 'Stop short if you feel pinching at the front of your shoulder.', 'Log extra weight from a belt as added weight.'],
  ),

  // Back
  deadlift: g(
    ['Stand with the bar over your mid-foot, feet hip-width apart.', 'Hinge down and grip just outside your legs, shins touching the bar, back flat.', 'Push the floor away, keeping the bar close, and stand tall. Lower it the same way.'],
    ['Brace your core hard before every rep.', 'The bar should drag up your shins and thighs.', 'Don\'t lean back at the top. Just stand straight.'],
  ),
  'barbell-row': g(
    ['Hold the bar with an overhand grip and hinge forward until your torso is about 45° or lower.', 'Pull the bar to your lower ribs, driving your elbows back.', 'Lower under control to straight arms.'],
    ['Keep your back flat and your hips still. Don\'t heave the weight.', 'Squeeze your shoulder blades together at the top.'],
  ),
  'db-row': g(
    ['Put one hand and knee on a bench, holding a dumbbell in the other hand.', 'Pull the dumbbell toward your hip, keeping your elbow close.', 'Lower until your arm is straight and you feel a stretch.'],
    ['Keep your back flat and parallel to the floor.', 'Think about pulling with your elbow, not your hand.'],
  ),
  't-bar-row': g(
    ['Straddle the bar, hinge forward and grab the handles.', 'Pull the plates toward your chest, keeping your back flat.', 'Lower slowly to full arm extension.'],
    ['Don\'t round your lower back as the weight goes down.', 'Keep your chest up and pull your elbows past your torso.'],
  ),
  'seated-cable-row': g(
    ['Sit with your feet on the platform and knees slightly bent, holding the handle.', 'Pull the handle to your stomach while sitting tall.', 'Let it go forward until your arms are straight and your shoulders reach slightly forward.'],
    ['Don\'t rock your torso back and forth.', 'Squeeze your shoulder blades together at the end of each pull.'],
  ),
  'machine-row': g(
    ['Set the chest pad so you can just reach the handles with straight arms.', 'Pull the handles back until your elbows pass your torso.', 'Return slowly.'],
    ['Keep your chest against the pad.', 'Lead with your elbows, not your wrists.'],
  ),
  'pull-up': g(
    ['Hang from the bar with an overhand grip slightly wider than your shoulders.', 'Pull yourself up until your chin is over the bar.', 'Lower all the way down to straight arms.'],
    ['Start each rep by pulling your shoulders down, away from your ears.', 'Avoid kipping or swinging.', 'Use a band or assisted machine until you can do full reps.'],
  ),
  'chin-up': g(
    ['Hang from the bar with palms facing you, hands shoulder-width apart.', 'Pull up until your chin clears the bar.', 'Lower slowly to a full hang.'],
    ['Keep your core tight so your legs don\'t swing.', 'Chin-ups work the biceps more than pull-ups do.'],
  ),
  'lat-pulldown': g(
    ['Sit with your thighs under the pad and grab the bar slightly wider than shoulder width.', 'Pull the bar down to your upper chest.', 'Let it rise until your arms are straight.'],
    ['Lean back only slightly and keep your chest up.', 'Pull your elbows down toward your back pockets.'],
  ),
  'straight-arm-pulldown': g(
    ['Stand facing a high cable with a bar or rope, arms straight in front of you.', 'Keeping your arms straight, sweep the bar down to your thighs.', 'Let it rise back to shoulder height.'],
    ['Hinge slightly at the hips and keep your arms locked.', 'You should feel this in your lats, not your triceps.'],
  ),
  'inverted-row': g(
    ['Lie under a bar set at waist height and grab it with an overhand grip.', 'With your body straight, pull your chest up to the bar.', 'Lower until your arms are straight.'],
    ['Keep your hips up in line with your shoulders.', 'Walk your feet forward to make it easier, or raise them to make it harder.'],
  ),
  shrug: g(
    ['Hold a barbell in front of your thighs with straight arms.', 'Lift your shoulders straight up toward your ears.', 'Hold for a second at the top, then lower.'],
    ['Don\'t roll your shoulders. Straight up and down.', 'Keep your arms straight; no bending at the elbows.'],
  ),
  'db-shrug': g(
    ['Stand holding a dumbbell in each hand at your sides.', 'Raise your shoulders as high as you can.', 'Pause, then lower slowly.'],
    ['Keep your neck relaxed and chin neutral.', 'Use straps if your grip gives out first.'],
  ),
  'back-extension': g(
    ['Set up on the back extension bench with the pad just below your hips.', 'Lower your torso by hinging at the hips.', 'Raise back up until your body is in a straight line.'],
    ['Don\'t hyperextend past straight at the top.', 'Hold a plate to your chest to add weight.'],
  ),

  // Shoulders
  'overhead-press': g(
    ['Stand with the bar on your front shoulders, hands just outside shoulder width.', 'Press the bar straight up, moving your head back slightly to let it pass.', 'Lock out overhead with the bar over your mid-foot, then lower to your shoulders.'],
    ['Squeeze your glutes and brace your core so your back doesn\'t arch.', 'Push your head "through the window" once the bar passes your face.'],
  ),
  'push-press': g(
    ['Start like an overhead press with the bar on your front shoulders.', 'Dip a few inches at the knees, then drive up explosively.', 'Use that drive to press the bar to lockout, then lower to your shoulders.'],
    ['The dip is short and straight down. Keep your chest up.', 'Your legs start the bar moving; your arms finish it.'],
  ),
  'db-shoulder-press': g(
    ['Sit or stand holding dumbbells at shoulder height, palms forward.', 'Press them overhead until your arms are straight.', 'Lower back to shoulder height.'],
    ['Keep your forearms vertical throughout.', 'Don\'t lean back to finish the rep.'],
  ),
  'machine-shoulder-press': g(
    ['Adjust the seat so the handles start at shoulder height.', 'Press up until your arms are almost straight.', 'Lower slowly.'],
    ['Keep your back flat against the pad.', 'Control the bottom of the movement. Don\'t drop into it.'],
  ),
  'arnold-press': g(
    ['Hold dumbbells in front of your shoulders, palms facing you.', 'Press up while rotating your palms to face forward at the top.', 'Reverse the rotation on the way down.'],
    ['Keep the movement smooth and continuous.', 'Use lighter weight than a standard dumbbell press.'],
  ),
  'lateral-raise': g(
    ['Stand holding dumbbells at your sides.', 'Raise your arms out to the sides until they are level with your shoulders.', 'Lower slowly.'],
    ['Lead with your elbows and keep a slight bend in them.', 'Don\'t shrug or swing. Light weight, strict reps.'],
  ),
  'cable-lateral-raise': g(
    ['Stand side-on to a low pulley and hold the handle with your far hand.', 'Raise your arm out to the side up to shoulder height.', 'Lower slowly across your body.'],
    ['The cable keeps tension on the muscle at the bottom, so go light.', 'Keep your torso still.'],
  ),
  'front-raise': g(
    ['Stand holding dumbbells in front of your thighs.', 'Raise them straight in front of you to shoulder height.', 'Lower under control.'],
    ['Don\'t lean back to swing the weight up.', 'Your front delts already work hard in presses, so moderate volume is enough.'],
  ),
  'rear-delt-fly': g(
    ['Hinge forward until your chest is nearly parallel to the floor, holding dumbbells.', 'Raise your arms out to the sides with a slight elbow bend.', 'Lower slowly.'],
    ['Think about pushing the weights out wide, not squeezing your shoulder blades.', 'Use light weight and feel the back of your shoulders.'],
  ),
  'reverse-pec-deck': g(
    ['Sit facing the pec deck pad and grab the handles with straight arms.', 'Sweep your arms back until they are in line with your body.', 'Return slowly.'],
    ['Keep your chest on the pad.', 'Don\'t pull your shoulder blades all the way together. Focus on the rear delts.'],
  ),
  'face-pull': g(
    ['Set a rope at upper-chest height and grab it with your palms facing in.', 'Pull the rope toward your face, separating the ends past your ears.', 'Return slowly with control.'],
    ['Finish with your elbows high and your hands beside your head.', 'Great for shoulder health. Use moderate weight and high reps.'],
  ),
  'upright-row': g(
    ['Hold a bar in front of your thighs with a grip about shoulder width.', 'Pull it up along your body until your elbows reach shoulder height.', 'Lower slowly.'],
    ['Lead with your elbows.', 'Stop at shoulder height; going higher can irritate the shoulders.'],
  ),

  // Arms
  'barbell-curl': g(
    ['Stand holding a barbell with an underhand, shoulder-width grip.', 'Curl the bar toward your shoulders, keeping your elbows at your sides.', 'Lower all the way down.'],
    ['Don\'t swing your hips to move the weight.', 'Control the lowering phase for 2–3 seconds.'],
  ),
  'db-curl': g(
    ['Stand holding dumbbells at your sides, palms forward.', 'Curl them up, turning your pinkies slightly upward at the top.', 'Lower slowly to straight arms.'],
    ['Keep your upper arms still.', 'Alternate arms or curl both together.'],
  ),
  'hammer-curl': g(
    ['Hold dumbbells at your sides with palms facing your body.', 'Curl them up keeping that neutral grip.', 'Lower slowly.'],
    ['Works your brachialis and forearms as well as your biceps.', 'Keep your elbows pinned to your sides.'],
  ),
  'preacher-curl': g(
    ['Sit at the preacher bench with your upper arms flat on the pad.', 'Curl the bar up toward your shoulders.', 'Lower until your arms are almost straight.'],
    ['Don\'t lift your elbows off the pad.', 'Go slow at the bottom, where the biceps is most stretched.'],
  ),
  'incline-db-curl': g(
    ['Sit back on a bench set to about 45°, arms hanging straight down.', 'Curl the dumbbells up without moving your upper arms.', 'Lower fully until your arms are straight.'],
    ['Your arms start behind your body, which stretches the biceps. Use lighter weight.', 'Keep your shoulders back against the bench.'],
  ),
  'cable-curl': g(
    ['Stand facing a low pulley holding a bar or rope.', 'Curl the handle toward your shoulders.', 'Lower slowly.'],
    ['The cable keeps tension on the whole rep.', 'Keep your elbows by your sides.'],
  ),
  'tricep-pushdown': g(
    ['Stand at a high pulley holding a bar or rope with your elbows at your sides.', 'Push the handle down until your arms are straight.', 'Let it rise until your forearms pass parallel.'],
    ['Only your forearms move. Keep your elbows pinned.', 'With a rope, spread the ends apart at the bottom.'],
  ),
  'overhead-tricep-extension': g(
    ['Face away from a cable (or hold a dumbbell) with your hands behind your head.', 'Extend your arms overhead until they are straight.', 'Lower back behind your head.'],
    ['Keep your elbows pointing forward, not flared.', 'This stretches the long head of the triceps. Go controlled.'],
  ),
  'skull-crusher': g(
    ['Lie on a bench holding an EZ-bar over your chest with arms straight.', 'Bend your elbows to lower the bar toward your forehead.', 'Extend back up.'],
    ['Keep your upper arms still and pointed slightly back.', 'Lowering just behind your head is often easier on the elbows.'],
  ),
  'close-grip-bench': g(
    ['Lie on the bench and grip the bar about shoulder width.', 'Lower it to your lower chest with your elbows close to your sides.', 'Press back up to lockout.'],
    ['Don\'t grip too narrow. Shoulder width protects your wrists.', 'Keep your elbows tucked to keep the work on the triceps.'],
  ),
  'db-kickback': g(
    ['Hinge forward with one hand on a bench, upper arm parallel to the floor.', 'Extend your forearm back until your arm is straight.', 'Bend back to 90°.'],
    ['Only the forearm moves.', 'Squeeze hard at full extension.'],
  ),
  'wrist-curl': g(
    ['Sit with your forearms on your thighs, palms up, wrists past your knees.', 'Curl the weight up using only your wrists.', 'Lower slowly.'],
    ['Small range of motion. Don\'t use your arms.', 'Do reverse wrist curls (palms down) for balance.'],
  ),

  // Legs
  squat: g(
    ['Set the bar on your upper back, step back and stand with your feet about shoulder width apart.', 'Sit down and back, bending your knees and hips together, until your hips are at or below knee height.', 'Drive up through your whole foot to stand.'],
    ['Brace your core and keep your chest up.', 'Push your knees out in line with your toes.', 'Keep your heels down throughout.'],
  ),
  'front-squat': g(
    ['Rest the bar on your front shoulders with your elbows high.', 'Squat straight down, keeping your torso upright.', 'Stand up, driving your elbows up.'],
    ['If your elbows drop, the bar rolls forward.', 'A cross-arm grip or straps can help if your wrists are tight.'],
  ),
  'leg-press': g(
    ['Sit in the machine with your feet shoulder-width apart in the middle of the platform.', 'Release the safeties and lower the platform until your knees are around 90°.', 'Press back up without locking your knees.'],
    ['Keep your lower back pressed into the seat.', 'Feet higher works more glutes; lower works more quads.'],
  ),
  'hack-squat': g(
    ['Stand on the platform with your back against the pad and shoulders under the pads.', 'Release the safeties and squat down until your thighs are at least parallel.', 'Press back up.'],
    ['Keep your heels down and knees tracking over your toes.', 'Control the bottom. Don\'t bounce.'],
  ),
  'goblet-squat': g(
    ['Hold a dumbbell or kettlebell at your chest with both hands.', 'Squat down between your knees, keeping your chest up.', 'Stand back up.'],
    ['Great for learning squat depth and posture.', 'Use your elbows to gently push your knees out at the bottom.'],
  ),
  'bulgarian-split-squat': g(
    ['Stand a stride in front of a bench and rest your back foot on it.', 'Lower straight down until your back knee nearly touches the floor.', 'Drive up through your front foot.'],
    ['Most of your weight stays on the front leg.', 'A slight forward lean adds more glute work.'],
  ),
  lunge: g(
    ['Stand holding dumbbells at your sides.', 'Step forward and lower until both knees are bent about 90°.', 'Push back to the start and switch legs.'],
    ['Keep your torso upright.', 'Your front knee can travel forward, but keep it in line with your toes.'],
  ),
  'step-up': g(
    ['Stand facing a box or bench holding dumbbells.', 'Step up with one foot and drive through it to stand on the box.', 'Step down under control and repeat.'],
    ['Push through the top leg. Don\'t spring off the back foot.', 'Choose a height where your knee is around hip level.'],
  ),
  'leg-extension': g(
    ['Sit with the pad on your lower shins and the knee joint lined up with the machine pivot.', 'Straighten your legs fully.', 'Lower slowly.'],
    ['Pause and squeeze your quads at the top.', 'Hold the handles to keep your hips down.'],
  ),
  'romanian-deadlift': g(
    ['Stand holding the bar at your hips with a shoulder-width grip.', 'Push your hips back, sliding the bar down your thighs with a slight knee bend.', 'Stop when you feel a strong hamstring stretch, then drive your hips forward to stand.'],
    ['Keep your back flat; the movement comes from the hips.', 'The bar stays close to your legs the whole time.'],
  ),
  'db-romanian-deadlift': g(
    ['Stand holding dumbbells in front of your thighs.', 'Hinge at the hips, lowering the dumbbells along your legs.', 'Squeeze your glutes to return to standing.'],
    ['Soft knees, flat back.', 'Go only as low as you can keep your back neutral.'],
  ),
  'sumo-deadlift': g(
    ['Take a wide stance with your toes turned out, the bar over your mid-foot.', 'Grip the bar inside your knees with your chest up and hips low.', 'Push your knees out and stand up, keeping the bar close.'],
    ['Think about spreading the floor apart with your feet.', 'Keep your hips from shooting up first.'],
  ),
  'lying-leg-curl': g(
    ['Lie face down with the pad just above your heels.', 'Curl your heels toward your glutes.', 'Lower slowly to almost straight.'],
    ['Keep your hips pressed into the bench.', 'Point your toes toward your shins for a stronger contraction.'],
  ),
  'seated-leg-curl': g(
    ['Sit with the pad behind your lower calves and the thigh pad snug.', 'Curl your legs down and back as far as you can.', 'Return slowly.'],
    ['Lean slightly forward to stretch your hamstrings more.', 'Control the return. Don\'t let the stack slam.'],
  ),
  'hip-thrust': g(
    ['Sit with your upper back against a bench and a padded bar across your hips.', 'Plant your feet and drive your hips up until your body is flat from shoulders to knees.', 'Lower your hips back down.'],
    ['Tuck your chin and keep your ribs down at the top.', 'Your shins should be vertical at the top.', 'Squeeze your glutes hard and pause.'],
  ),
  'glute-bridge': g(
    ['Lie on your back with knees bent and feet flat.', 'Drive through your heels to lift your hips.', 'Lower slowly.'],
    ['Squeeze your glutes at the top. Don\'t arch your lower back.', 'Add a weight on your hips to progress.'],
  ),
  'hip-abduction': g(
    ['Sit in the machine with the pads on the outside of your knees.', 'Push your knees outward as far as you can.', 'Return slowly.'],
    ['Leaning slightly forward puts more work on the glutes.', 'Control both directions.'],
  ),
  'hip-adduction': g(
    ['Sit with the pads on the inside of your knees, legs apart.', 'Squeeze your legs together.', 'Let them open slowly.'],
    ['Start with a comfortable range and widen it over time.', 'Keep your back against the pad.'],
  ),
  'standing-calf-raise': g(
    ['Stand with the balls of your feet on the platform and shoulders under the pads.', 'Rise up onto your toes as high as you can.', 'Lower until your heels drop below the platform.'],
    ['Pause at the top and stretch at the bottom. No bouncing.', 'Keep your knees straight.'],
  ),
  'seated-calf-raise': g(
    ['Sit with the pad on your lower thighs and the balls of your feet on the platform.', 'Raise your heels as high as you can.', 'Lower into a full stretch.'],
    ['Bent knees target the soleus, the deeper calf muscle.', 'Slow, full-range reps.'],
  ),

  // Full body / power
  'power-clean': g(
    ['Start like a deadlift with the bar over your mid-foot.', 'Pull the bar off the floor, then explode up by extending your hips, knees and ankles.', 'Pull yourself under the bar and catch it on your front shoulders in a partial squat.'],
    ['The bar stays close to your body the whole way.', 'Learn it with light weight or a coach. Technique first.'],
  ),
  'kettlebell-swing': g(
    ['Stand with the kettlebell slightly in front of you, feet shoulder-width apart.', 'Hike it back between your legs, then snap your hips forward to swing it to chest height.', 'Let it fall back and repeat.'],
    ['It\'s a hip hinge, not a squat or a front raise.', 'Squeeze your glutes at the top and keep your arms relaxed.'],
  ),
  burpee: g(
    ['From standing, squat down and place your hands on the floor.', 'Jump your feet back to a plank (add a push-up if you like).', 'Jump your feet back in and jump up with your arms overhead.'],
    ['Land softly.', 'Keep a steady pace instead of sprinting and stopping.'],
  ),

  // Core
  plank: g(
    ['Rest on your forearms and toes with your elbows under your shoulders.', 'Make a straight line from head to heels.', 'Hold.'],
    ['Squeeze your glutes and brace like you\'re about to be poked in the stomach.', 'Don\'t let your hips sag or pike up.'],
  ),
  'side-plank': g(
    ['Lie on your side propped on one forearm, feet stacked.', 'Lift your hips until your body is in a straight line.', 'Hold, then switch sides.'],
    ['Keep your hips stacked. Don\'t rotate forward.', 'Bend your bottom knee to make it easier.'],
  ),
  crunch: g(
    ['Lie on your back with knees bent and hands lightly behind your head.', 'Curl your shoulders off the floor toward your hips.', 'Lower slowly.'],
    ['Don\'t pull on your neck.', 'Think about bringing your ribs toward your pelvis.'],
  ),
  'cable-crunch': g(
    ['Kneel facing a high pulley holding a rope beside your head.', 'Crunch down, bringing your elbows toward your thighs.', 'Return to upright slowly.'],
    ['Your hips stay still. The movement is spinal flexion.', 'Exhale hard as you crunch.'],
  ),
  'hanging-leg-raise': g(
    ['Hang from a pull-up bar with straight arms.', 'Raise your legs (straight or bent) until your thighs pass parallel.', 'Lower slowly without swinging.'],
    ['Curl your pelvis up at the top to really work the abs.', 'Bent knees make it easier.'],
  ),
  'ab-wheel': g(
    ['Kneel holding the ab wheel under your shoulders.', 'Roll forward slowly, extending your body as far as you can control.', 'Pull back to the start using your abs.'],
    ['Keep your lower back from sagging. Stop before it does.', 'Start with short rollouts and build range over time.'],
  ),
  'russian-twist': g(
    ['Sit with knees bent and lean back slightly, feet on the floor or raised.', 'Rotate your torso to touch the floor (or a weight) beside one hip.', 'Rotate to the other side.'],
    ['Turn from your ribs, not just your arms.', 'Keep your back straight, not rounded.'],
  ),
  'dead-bug': g(
    ['Lie on your back with arms pointing up and knees bent 90° over your hips.', 'Slowly extend the opposite arm and leg toward the floor.', 'Return and switch sides.'],
    ['Keep your lower back pressed into the floor the whole time.', 'Slow and controlled beats fast.'],
  ),

  // Cardio
  running: g(
    ['Warm up with 5 minutes of easy jogging or brisk walking.', 'Run at a pace where you can still speak in short sentences for most of the session.', 'Cool down with a few minutes of walking.'],
    ['Land with your feet under your hips, not out in front.', 'Increase weekly distance gradually, about 10% at a time.'],
  ),
  treadmill: g(
    ['Start the belt slowly and step on, then build up to your target pace.', 'Set a 1% incline to mimic outdoor running.', 'Slow down gradually before stepping off.'],
    ['Avoid holding the handrails.', 'Use intervals or incline walks for variety.'],
  ),
  walking: g(
    ['Walk at a brisk pace where your breathing is elevated but comfortable.', 'Swing your arms naturally and stand tall.'],
    ['Hills or a weighted vest add intensity.', 'Daily walks help recovery and overall health.'],
  ),
  cycling: g(
    ['Set the saddle so your knee is slightly bent at the bottom of the pedal stroke.', 'Pedal at a steady cadence (about 80–90 rpm) at your chosen resistance.'],
    ['Keep your upper body relaxed.', 'Mix steady rides with short hard intervals.'],
  ),
  'rowing-machine': g(
    ['Strap in, grab the handle and start with knees bent and arms straight.', 'Drive with your legs, then lean back slightly and pull the handle to your lower ribs.', 'Return in reverse order: arms, body, then legs.'],
    ['Legs, body, arms on the drive; arms, body, legs on the recovery.', 'About 60% of the power comes from your legs.'],
  ),
  elliptical: g(
    ['Step on and hold the handles, then start pedaling.', 'Push and pull with your arms while driving through your legs.'],
    ['Stand tall. Don\'t lean on the handles.', 'Increase resistance rather than speed for more challenge.'],
  ),
  swimming: g(
    ['Warm up with a few easy lengths.', 'Swim your main set at a steady effort, resting at the wall as needed.', 'Cool down with easy lengths.'],
    ['Breathe out underwater so you only need to inhale when you turn your head.', 'Log the total distance and time for the session.'],
  ),
  'stair-climber': g(
    ['Step on and start at a moderate speed.', 'Climb with your whole foot on each step, standing upright.'],
    ['Avoid leaning on the rails. Hold them lightly for balance only.', 'Great low-impact cardio that also works the glutes.'],
  ),
  'jump-rope': g(
    ['Hold the handles at hip height with the rope behind you.', 'Turn the rope with your wrists and jump just high enough to clear it.', 'Land softly on the balls of your feet.'],
    ['Keep your elbows close to your body.', 'Start with short rounds, like 30 seconds on and 30 off.'],
  ),

  // Machines and assisted
  'incline-chest-press-machine': g(
    ['Set the seat so the handles start at your upper chest.', 'Press up and forward until your arms are almost straight.', 'Lower slowly until you feel a stretch across the top of your chest.'],
    ['Keep your shoulder blades pulled back against the pad.', "Don't let your lower back arch off the seat."],
  ),
  'decline-chest-press-machine': g(
    ['Adjust the seat so the handles line up with your lower chest.', 'Press down and forward until your arms are almost straight.', 'Return under control.'],
    ['Keep your chest up and back flat against the pad.', 'Use a full range without letting the stack touch.'],
  ),
  'smith-bench-press': g(
    ['Set the bench so the bar comes down to your mid-chest.', 'Unhook the bar by rotating it and lower it to your chest.', 'Press up, then rotate the hooks to re-rack.'],
    ['Set the safety stops just below chest height.', 'Squeeze your shoulder blades together as on a free bench press.'],
  ),
  'smith-incline-press': g(
    ['Set the bench to 30–45° under the bar so it lands on your upper chest.', 'Unhook and lower the bar to just below your collarbones.', 'Press straight up and re-rack.'],
    ['Keep your elbows slightly tucked, not flared.', 'Set the safety stops before you start.'],
  ),
  'low-cable-fly': g(
    ['Set both pulleys low and hold a handle in each hand, palms facing forward.', 'With a soft bend in your elbows, sweep your hands up and together to chest height.', 'Lower back down slowly.'],
    ['Lean slightly forward with a staggered stance.', 'Lead with your hands, not your shoulders: this hits the upper chest.'],
  ),
  'assisted-dip': g(
    ['Choose the assistance: more weight on the stack means more help.', 'Kneel or stand on the pad and grip the dip handles with straight arms.', 'Lower until your upper arms are about parallel to the floor, then press back up.'],
    ['Log the assistance you used; less assistance over time means you are getting stronger.', 'Lean slightly forward for more chest, stay upright for more triceps.'],
  ),
  'chest-supported-row': g(
    ['Set the chest pad so you can reach the handles with straight arms.', 'Pull the handles toward your ribs, squeezing your shoulder blades together.', 'Return slowly to a full stretch.'],
    ['Keep your chest on the pad the whole time.', "Don't shrug: pull with your back, not your neck."],
  ),
  'high-row-machine': g(
    ['Sit with your thighs under the pad and grab the handles overhead and in front of you.', 'Pull down and back until your hands reach your upper chest.', 'Let the handles rise back under control.'],
    ['Drive your elbows down toward your hips.', 'Keep your chest up throughout.'],
  ),
  'low-row-machine': g(
    ['Sit with your chest against the pad and grab the low handles.', 'Row the handles back to your waist, elbows close to your body.', 'Extend your arms fully on the way back.'],
    ['Pause for a moment with your shoulder blades squeezed.', "Don't jerk the weight with your lower back."],
  ),
  'machine-lat-pulldown': g(
    ['Adjust the thigh pad, sit down and grab the handles above you.', 'Pull the handles down to your upper chest.', 'Let them rise until your arms are straight.'],
    ['Think about pulling your elbows into your back pockets.', 'Lean back only slightly.'],
  ),
  'close-grip-pulldown': g(
    ['Attach a close-grip (V) handle, sit and lock your thighs under the pad.', 'Pull the handle to your upper chest, leaning back slightly.', 'Return until your arms are fully straight.'],
    ['Keep your elbows close to your sides.', 'Control the way up; let your lats stretch.'],
  ),
  'pullover-machine': g(
    ['Sit with your back against the pad and place your elbows or hands on the bar above you.', 'Pull the bar down in an arc to your waist.', 'Return slowly until you feel a stretch in your lats.'],
    ['Keep your arms almost straight: the movement comes from your shoulders.', "Don't let your lower back arch."],
  ),
  'assisted-pull-up': g(
    ['Choose the assistance: more weight on the stack means more help.', 'Kneel or stand on the pad and grip the bar wider than your shoulders, palms facing away.', 'Pull your chest toward the bar, then lower to straight arms.'],
    ['Log the assistance you used; reduce it over time until you can do bodyweight pull-ups.', 'Lead with your chest and squeeze your shoulder blades down.'],
  ),
  'assisted-chin-up': g(
    ['Choose the assistance and kneel or stand on the pad.', 'Grip the bar about shoulder width with palms facing you.', 'Pull your chin over the bar, then lower all the way down.'],
    ['Log the assistance you used; less assistance means more strength.', 'Keep your elbows pointing down, not out.'],
  ),
  'back-extension-machine': g(
    ['Sit with the pad across your upper back and your feet secured.', 'Extend backward until your body is upright or slightly past.', 'Return forward under control.'],
    ['Move smoothly; no jerking at the top.', 'Keep your neck in line with your spine.'],
  ),
  'smith-shoulder-press': g(
    ['Set an upright bench under the bar so it comes down in front of your chin.', 'Unhook the bar and lower it to about chin height.', 'Press up until your arms are straight, then re-rack.'],
    ['Keep your back flat against the bench.', 'Set the safety stops at chin height.'],
  ),
  'lateral-raise-machine': g(
    ['Adjust the seat so your shoulders line up with the machine pivots.', 'Place your arms against the pads and raise them out to your sides to shoulder height.', 'Lower slowly.'],
    ["Lead with your elbows and don't shrug.", 'Use a weight you can control without swinging.'],
  ),
  'bicep-curl-machine': g(
    ['Set the seat so your upper arms rest flat on the pad with elbows at the pivot.', 'Curl the handles up toward your shoulders.', 'Lower all the way down slowly.'],
    ['Keep your upper arms on the pad throughout.', 'Squeeze at the top for a second.'],
  ),
  'machine-preacher-curl': g(
    ['Sit with the backs of your arms on the angled pad and grab the handles.', 'Curl up until your forearms are vertical.', 'Lower until your arms are almost straight.'],
    ['Control the bottom: that is where the stretch is.', "Don't lift your elbows off the pad."],
  ),
  'tricep-extension-machine': g(
    ['Sit with your upper arms on the pad and elbows lined up with the pivot.', 'Push the handles down until your arms are straight.', 'Return slowly until your forearms pass vertical.'],
    ['Keep your elbows still: only your forearms move.', 'Lock out fully at the bottom.'],
  ),
  'seated-dip-machine': g(
    ['Sit with your back against the pad and grab the handles at your sides.', 'Press the handles down until your arms are straight.', 'Let them rise until your elbows are at about 90°.'],
    ['Keep your shoulders down, away from your ears.', 'Stay upright to keep the focus on your triceps.'],
  ),
  'smith-squat': g(
    ['Set the bar at shoulder height and step under it, resting it on your upper back.', 'Unhook and squat down until your thighs are at least parallel to the floor.', 'Drive back up and re-rack.'],
    ['Place your feet slightly in front of the bar.', 'Set the safety stops just below your lowest position.'],
  ),
  'pendulum-squat': g(
    ['Step in with your back against the pad and shoulders under the yokes.', 'Release the safety and squat down as deep as is comfortable.', 'Push through your whole foot to stand back up.'],
    ['Keep your lower back on the pad.', 'Feet lower on the platform work the quads more.'],
  ),
  'belt-squat': g(
    ['Attach the belt around your hips and stand on the platform.', 'Squat down with your chest up until your thighs are about parallel.', 'Stand back up.'],
    ['Great for loading the legs without loading your spine.', 'Hold the handles lightly for balance.'],
  ),
  'standing-leg-curl': g(
    ['Stand facing the machine with the pad behind one ankle.', 'Curl your heel toward your glutes.', 'Lower slowly, then switch legs after the set.'],
    ['Keep your hips against the pad; no swinging.', 'Log both legs with the same reps.'],
  ),
  'hip-thrust-machine': g(
    ['Sit with your upper back against the pad and the belt or pad across your hips.', 'Drive your hips up until your body is straight from shoulders to knees.', 'Lower under control.'],
    ['Squeeze your glutes hard at the top.', 'Keep your chin tucked and ribs down.'],
  ),
  'glute-kickback-machine': g(
    ['Set up on the machine with one foot on the plate or pad.', 'Push your leg back and up until your hip is fully extended.', 'Return slowly, then switch legs.'],
    ["Don't arch your lower back to get extra range.", 'Pause and squeeze at the top.'],
  ),
  'leg-press-calf-raise': g(
    ['Sit in the leg press with the balls of your feet on the bottom edge of the platform.', 'Keeping your knees straight but not locked, press through your toes.', 'Lower your heels until you feel a stretch.'],
    ['Keep the safety catches on and never fully lock your knees.', 'Use a full range: deep stretch, full squeeze.'],
  ),
  'ab-crunch-machine': g(
    ['Adjust the seat and grab the handles or place your arms on the pads.', 'Crunch forward, curling your ribs toward your hips.', 'Return slowly without letting the stack touch.'],
    ['Move from your abs, not your arms.', 'Breathe out as you crunch.'],
  ),
  'torso-rotation': g(
    ['Sit and lock your legs in place, holding the pads or handles.', 'Rotate your torso to one side against the resistance.', 'Return to centre slowly; do both sides.'],
    ['Use a light weight and a controlled speed.', 'Keep your hips facing forward.'],
  ),
  'captains-chair': g(
    ['Stand on the step with your back against the pad and forearms on the arm rests.', 'Raise your knees (or straight legs) up toward your chest.', 'Lower slowly without swinging.'],
    ['Tilt your pelvis up at the top to work the lower abs.', 'Straight legs make it harder.'],
  ),

  // Cardio
  jogging: g(
    ['Warm up with a few minutes of brisk walking.', 'Jog at an easy pace where you could still hold a conversation.', 'Walk for a few minutes to cool down.'],
    ['Land with your feet under your hips, not out in front.', 'Log your distance and time; Forge works out your pace.'],
  ),
  'trail-running': g(
    ['Warm up with easy walking or jogging.', 'Run at a steady effort, shortening your stride on climbs and descents.', 'Cool down with an easy walk.'],
    ['Watch the ground a few steps ahead.', 'Run by effort, not pace: hills slow everyone down.'],
  ),
  sprints: g(
    ['Warm up for 10 minutes with jogging and drills.', 'Sprint a set distance, such as 100 m, at close to full speed.', 'Walk back or rest fully before the next one. Log each sprint as a set.'],
    ['Stay tall and drive your arms.', 'Quality over quantity: stop when your speed drops off.'],
  ),
  'treadmill-walk': g(
    ['Start the belt slowly and step on.', 'Walk at a brisk pace with relaxed arms.', 'Slow down for a couple of minutes before stopping.'],
    ["Don't hold the handrails; let your arms swing.", 'Log the distance and time from the display.'],
  ),
  'incline-walk': g(
    ['Start walking on a flat belt, then raise the incline (10–15% is common).', 'Walk at a steady pace for the session.', 'Lower the incline and slow down to cool down.'],
    ["Don't hold the rails: it takes the work away from your legs.", 'Stand tall instead of leaning into the hill.'],
  ),
  hiking: g(
    ['Plan your route and bring water.', 'Hike at a steady pace, shortening your steps on steep sections.', 'Log the distance and total time when you finish.'],
    ['Use poles on steep or long descents to save your knees.', 'Moving time and elevation from your watch can go in the notes.'],
  ),
  rucking: g(
    ['Pack a weighted backpack (start with around 10% of your bodyweight).', 'Walk at a brisk pace, standing tall.', 'Log the distance and time; note the pack weight in the exercise notes.'],
    ['Keep the weight high and tight against your back.', 'Build the load and distance gradually.'],
  ),
  'stationary-bike': g(
    ['Set the seat so your knee is slightly bent at the bottom of the pedal stroke.', 'Pedal at a steady cadence and resistance for the session.', 'Finish with a few easy minutes.'],
    ['Keep your upper body relaxed.', "Log the distance and time from the bike's display."],
  ),
  'mountain-biking': g(
    ['Check your tyres and brakes before you set off.', 'Ride at a steady effort, shifting early for climbs.', 'Log the distance and total time.'],
    ['Stand on the pedals for rough descents.', 'Look where you want to go, not at obstacles.'],
  ),
  'spin-class': g(
    ['Set the seat and handlebars before class starts.', "Follow the instructor's cues for cadence and resistance.", 'Log the class length and calories.'],
    ['Never pedal with zero resistance at high speed.', 'Keep your shoulders relaxed and core braced.'],
  ),
  'air-bike': g(
    ['Set the seat so your leg is almost straight at the bottom.', 'Push and pull the handles while you pedal.', 'Work in intervals, e.g. 20 seconds hard and 40 easy.'],
    ['The harder you go, the more resistance you get.', 'Log the time and the calories from the display.'],
  ),
  'ski-erg': g(
    ['Stand facing the machine and reach up to grab both handles.', 'Pull down hard, hinging at the hips and bending your knees slightly.', 'Let the handles rise as you stand back up.'],
    ['The power comes from your hips and lats, not just your arms.', 'Log the metres and time; Forge shows your /500m split.'],
  ),
  kayaking: g(
    ['Sit upright with your feet braced and hands shoulder-width on the paddle.', 'Rotate your torso to drive each stroke.', 'Log the distance and time.'],
    ['Power comes from your core, not just your arms.', 'Always wear a buoyancy aid.'],
  ),
  hiit: g(
    ['Warm up for 5 minutes.', 'Alternate short, hard efforts with easy recovery, such as 30 seconds on and 30 off.', 'Cool down and log the total time and calories.'],
    ['Go hard on the work intervals; rest fully on the easy ones.', 'Two or three sessions a week is plenty.'],
  ),
  'battle-ropes': g(
    ['Hold one rope end in each hand with your knees bent and chest up.', 'Make fast waves with alternating or double arms.', 'Work in rounds, such as 30 seconds on and 30 off.'],
    ['Stay in a half-squat and brace your core.', 'Move from your shoulders, keeping the waves going to the anchor.'],
  ),
  boxing: g(
    ['Wrap your hands and warm up with shadow boxing.', 'Work rounds on the bag or pads, typically 3 minutes with 1 minute rest.', 'Log the total time and calories.'],
    ['Turn your hips and shoulders into each punch.', 'Keep your hands up and chin down between combinations.'],
  ),
  dance: g(
    ['Warm up with a few easy songs.', 'Dance continuously for the session or class.', 'Log the total time and calories.'],
    ['Any style counts: keep moving.', 'Drink water between songs.'],
  ),
  basketball: g(
    ['Warm up with jogging, stretches and easy shooting.', 'Play your game or drills.', 'Log the time played and calories.'],
    ['Land softly from jumps with your knees over your toes.', 'Good court shoes help protect your ankles.'],
  ),
  soccer: g(
    ['Warm up with jogging, skips and passing.', 'Play your match or training session.', 'Log the time played and calories.'],
    ['Stretch your hamstrings and hips afterwards.', 'Wear shin guards for matches.'],
  ),
  tennis: g(
    ['Warm up with a gentle rally and some shoulder circles.', 'Play your match or practice session.', 'Log the time played and calories.'],
    ['Rotate through your hips and shoulders on groundstrokes.', 'Stay on the balls of your feet between shots.'],
  ),
  pickleball: g(
    ['Warm up with easy dinking at the kitchen line.', 'Play your games.', 'Log the time played and calories.'],
    ['Stay low with your paddle up at the net.', 'Shuffle rather than cross your feet when moving sideways.'],
  ),
};
