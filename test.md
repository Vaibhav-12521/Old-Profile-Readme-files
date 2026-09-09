# My Answers — Short Version

## Business Analytics

### 1. Ravi matching 150 recordings by hand

I don't think there's actually one matching system here. There are three different ways a file can come in, and they don't seem to share the same logic. That's probably why most of the files never get matched in the first place — the matching code simply isn't being reached.

I'd verify that first. Then I'd route all three paths through one matching pipeline using the phone number and the time from the filename. Ravi should only have to look at the few cases where the system genuinely can't decide.

### 2. One call showing as two rows

The same attempt number is the giveaway. If it were actually a redial, I'd expect the second record to have attempt 2.

So I wouldn't even start with a time window. I'd group by prospect, rep, and attempt number. Also, there are 47 groups but 48 extra rows, which means one group actually has three rows, not just two. The fix needs to account for that.

After that, I'd add a unique index so the database can't allow the same situation again.

### 3. Sunday recording, Wednesday upload

The problem is that we were using the date the file reached Drive. That tells us when the file was transferred, not when the call actually happened.

The phone already puts the real timestamp in the filename, and it's only off by about a minute, so that's the better source.

The 330-minute difference is also a big clue. That's exactly the India timezone offset, so this isn't random bad data — it's a timezone assumption somewhere in the code.

And the fact that the search returned nothing and then quietly stopped is probably how those 370 files disappeared from the process.

### 4. Getting the phone number out of the filename

Both numbers are 14 characters long, so anything based on length or position is going to fail eventually.

Since these files come from four different apps, I'd use a small recogniser for each filename format instead of trying to force one regex to handle everything.

I'd also validate what I'm extracting. A timestamp should parse as a real date, while an Indian mobile number should actually look like one.

And `record-1784124511449.wav` doesn't contain a phone number at all. That's an epoch timestamp. So "no phone number found" needs to be a valid result — not an error and definitely not something the system should guess.

### 5. One tap, two saves

`isPending` is React state, so changing it doesn't immediately update the button. There's a small window before the next render where the button can still be clicked, and 217ms is easily enough for that to happen.

But I wouldn't solve this only on the frontend. A disabled button isn't a guarantee.

I'd send an idempotency key with the request and enforce uniqueness in the database. The rule should ultimately live where the data is stored.

### 6. How wide should the duplicate window be?

I think "30 seconds is safer" is actually backwards here.

A 30-second window is pretty aggressive because real redials can happen within 15–30 seconds. That means we could accidentally delete a genuine call that Meera actually made.

A duplicate can always be found later. A legitimate call that we incorrectly block is much harder to recover.

So I'd keep the time window very narrow, maybe around 2 seconds. Even better, I'd use things like attempt number and duration instead of relying only on time.

And I wouldn't delete anything automatically. I'd flag suspicious duplicates and keep both records.

### 7. 60 recordings uploaded, none showing

The checklist is mostly checking the files, but the files themselves are fine.

The actual upload is being rejected by the API, even though Meera can access the screen. That tells me her role has permission to open the page but doesn't have permission to call the upload endpoint.

The worse part is that the UI told her the upload succeeded all 60 times.

A failed response should never just be swallowed. That's what turned a small permissions/configuration issue into 60 wasted uploads.

---

## Platform Development

### 1. Empty section in the profile

There are six model calls chained together, but nothing seems to validate the result between them.

One response came back without the required field, and because there was a `?.` to prevent crashes, the page simply rendered an empty section.

That's actually the bigger problem: "the model didn't generate anything" and "there's genuinely nothing to show" now look exactly the same to the user.

I'd validate every model response against a schema, retry once if necessary, and then show something like "Couldn't generate this section" instead of silently displaying nothing.

### 2. Screenshot button does nothing

If there's no error and no failure, my first suspicion would be that the promise is just hanging.

The screenshot library is fetching fonts so it can embed them, and if that request never finishes, the whole operation can sit there waiting forever.

I'd put a timeout around the network request and preferably self-host the fonts so the process doesn't depend on an external request.

In general, any `await` involving a network call that I don't control should have some kind of timeout.

That said, if the actual requirement is just to give his brother a file, I'd probably generate a PDF on the server instead of trying to screenshot the browser.

### 3. New page with no styling

Two different problems could cause this, so I'd inspect the DOM before changing the build configuration.

Either the CSS isn't making it into the bundle, or the elements are ending up with something like `class="undefined"` because the stylesheet was supposed to be a `.module.css` file.

The second explanation fits better if absolutely nothing is styled.

The misleading part is "I imported it the same way as the other files." If the other files are CSS modules and this one isn't, the import can look almost identical while behaving completely differently.

### 4. Leave page crashes

Since it crashes when someone selects a date range, I'd look at the code that loops through the days.

My guess is that one of those days doesn't have working hours — maybe a weekend or a holiday — and the code assumes the value will always exist.

But there's a bigger design problem too. Storing something like `"3pm-7pm IST"` as a string means every part of the application has to interpret that string again.

I'd store working hours as structured data and keep the timezone as an actual field.

Also, one missing value shouldn't be able to bring down the entire app. If it can, the error boundary is probably too high up, sitting only at the root.

### 5. "Leave page broken"

I don't think the problem is that Meera isn't technical enough to report the issue properly.

The system already knew the route, component, line number, version, and other useful debugging information. It just threw all of that away and asked her to remember what happened.

She doesn't need a stack trace.

I'd show her a short error code like `LV-7F3A`, log the full technical details against that code, and let her simply report those few characters.

Her nine-word description can then be connected to a complete bug report automatically.

### 6. Read-only finance access

Hiding the buttons isn't security.

The endpoint is still accessible, and someone can call it directly with something like `curl`. The fact that there's already a comment in the code pointing this out makes that pretty clear.

The permission check needs to happen on the server, on every relevant endpoint. I'd also make the default behaviour deny access unless an endpoint explicitly allows it.

And I'd test it properly by making a POST request as that colleague and verifying that the server returns a 403. Looking at the UI and seeing that the button isn't there isn't a security test.

### 7. Whose 19:10?

The timestamp column doesn't contain a timezone, so different systems are free to interpret it differently.

Neither system is necessarily "wrong." The schema is missing information.

The fact that all 62 records have exactly the same 5:30-hour difference strongly suggests a convention mismatch rather than corrupted data. It's the same kind of clue as the 330-minute difference earlier.

I'd store timestamps in UTC using a type that actually represents a timestamp, and only convert them for display at the edges of the system.

The risky part is the backfill. If some historical records were stored as IST and others as UTC, blindly converting everything could break the records that were already correct.

---

## What I noticed across all of them

Most of these aren't really 14 completely different problems.

A lot of them have the same underlying issue: **they fail silently.**

The search that found nothing and stopped. The upload that reported success even though the API rejected it. The blank profile section. The button that just sat there doing nothing.

In most cases, the actual bug wasn't huge. What made it expensive was that nobody got a useful signal when it happened, so the problem could sit there for months until a customer finally noticed.

Another pattern is **putting important rules in the wrong place.**

A disabled button, hidden buttons, or a screen that looks read-only aren't security or data-integrity rules. Those rules need to be enforced where the data actually enters or changes the system.

There's also a recurring problem with **turning structured information into strings.**

Working hours stored as `"3pm-7pm IST"`, phone numbers mixed into filenames, timestamps without timezones — all of these force the next piece of code to parse the value again.

And every time something gets parsed again, there's another opportunity for two parts of the system to interpret it differently.

The exact numbers are another useful clue.

When I see things like **330 minutes**, **5 hours 30 minutes**, or **the exact same attempt number**, I immediately suspect a code assumption or convention rather than messy data.

If the differences were random, I'd investigate the data itself. Getting that distinction right can save a lot of time.

And finally, I think there's an important difference between **the bug** and **why nobody caught the bug**.

Fixing the route guard might take ten minutes.

Fixing the UI that hid the error is what prevents the next version of the same problem from sitting unnoticed for months.

That's usually the more valuable fix.
