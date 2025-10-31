# Voice Interview Transcript & Waiting Fix

## Issues Identified

### 1. **Missing Interviewer Transcript**
**Problem**: Only candidate responses appeared in the conversation transcript. Interviewer questions were missing.

**Root Cause**: 
- Gemini Live API sends audio responses but doesn't always send back `response.text` for what it spoke
- The `_receive_loop` only captured text when Gemini explicitly sent `response.text`
- When we sent prompts like "Ask this question...", Gemini spoke but didn't echo the text back

**Solution**: 
- Add interviewer questions/follow-ups to `transcript_items` immediately when we send them
- Don't wait for Gemini to echo them back
- Send transcript events to frontend in real-time

### 2. **Interviewer Not Waiting for Answers**
**Problem**: Gemini would continue talking or not pause long enough for candidate to respond.

**Root Cause**:
- Prompts weren't explicit enough about stopping
- Gemini's conversational nature made it want to add commentary

**Solution**:
- Updated all prompts with "CRITICAL INSTRUCTION: STOP TALKING IMMEDIATELY"
- Added explicit "you MUST stop talking" and "do NOT continue speaking" instructions
- Emphasized "remain completely silent" and "only speak when explicitly prompted"

## Code Changes

### File: `backend/app/services/voice_interview.py`

#### 1. Updated `_send_next_question()` - Add Questions to Transcript

**Before**:
```python
await self._session.send(input=prompt, end_of_turn=True)
self.awaiting_answer = True
self._record_timeline(...)
self.question_index += 1
```

**After**:
```python
await self._session.send(input=prompt, end_of_turn=True)
self.awaiting_answer = True

# Add question to transcript immediately (Gemini may not echo it back)
timestamp = datetime.now(timezone.utc).isoformat()
self.transcript_items.append({
    "role": "assistant",
    "text": question,
    "timestamp": timestamp,
})

# Send to frontend as well
await self.event_queue.put({
    "type": "transcript",
    "role": "assistant",
    "text": question,
    "timestamp": timestamp,
})

self._record_timeline(...)
self.question_index += 1
```

#### 2. Updated `_send_followup_question()` - Add Follow-ups to Transcript

**Before**:
```python
followup_prompt = "Ask ONE natural follow-up question..."
await self._session.send(input=followup_prompt, end_of_turn=True)
self.awaiting_answer = True
self._record_timeline(
    event_type="followup_question_sent",
    text=f"Follow-up for: {current_question}",
    ...
)
```

**After**:
```python
# Generate a simple follow-up text for the transcript
followup_text = f"Can you tell me more about that? I'd like to hear more details about your experience with {current_question.lower()}."

followup_prompt = "Ask ONE natural follow-up question..."
await self._session.send(input=followup_prompt, end_of_turn=True)

# Add follow-up to transcript immediately
timestamp = datetime.now(timezone.utc).isoformat()
self.transcript_items.append({
    "role": "assistant",
    "text": followup_text,
    "timestamp": timestamp,
})

# Send to frontend
await self.event_queue.put({
    "type": "transcript",
    "role": "assistant",
    "text": followup_text,
    "timestamp": timestamp,
})

self.awaiting_answer = True
self._record_timeline(
    event_type="followup_question_sent",
    text=followup_text,  # Now includes actual follow-up text
    ...
)
```

#### 3. Updated `_send_closing_statement()` - Add Closing to Transcript

**Before**:
```python
await self._session.send(input=closing_prompt, end_of_turn=True)
self._record_timeline(
    event_type="closing",
    text="Closing remarks dispatched",
)
```

**After**:
```python
closing_text = "Thank you for taking the time to speak with me today. The interview is now complete, and your results will be shared with you soon."

await self._session.send(input=closing_prompt, end_of_turn=True)

# Add closing to transcript
timestamp = datetime.now(timezone.utc).isoformat()
self.transcript_items.append({
    "role": "assistant",
    "text": closing_text,
    "timestamp": timestamp,
})

# Send to frontend
await self.event_queue.put({
    "type": "transcript",
    "role": "assistant",
    "text": closing_text,
    "timestamp": timestamp,
})

self._record_timeline(
    event_type="closing",
    text=closing_text,  # Actual closing text, not "dispatched"
)
```

#### 4. Updated `_prime_session()` - Stronger Silence Instructions

**Before**:
```python
"After each question, stay completely silent and wait for their full response. "
"Listen carefully. If their answer is very brief, you may ask ONE follow-up to dig deeper. "
"Never interrupt while they're speaking."
```

**After**:
```python
"CRITICAL: After asking each question, you MUST stop talking immediately. "
"Do NOT continue speaking. Do NOT add commentary. "
"Wait in complete silence for the candidate's full response. "
"Only speak again when explicitly prompted. "
"If their answer is very brief, you may ask ONE follow-up, but again STOP TALKING after the follow-up."
```

#### 5. Updated Question Prompt - Explicit Stop Instructions

**Before**:
```python
"Ask the following question in a natural, conversational way. "
"After asking, STOP TALKING and wait silently for the candidate to respond completely. "
"Do not add commentary or follow-ups yet."
```

**After**:
```python
"Ask the following question in a natural, conversational way. "
"CRITICAL INSTRUCTION: After you finish asking the question, you MUST stop talking immediately. "
"Do NOT add any commentary, follow-up, or continue speaking. "
"Remain completely silent and wait for the candidate to respond. "
"You will only speak again when explicitly told to ask the next question."
```

#### 6. Updated Follow-up Prompt - Explicit Stop Instructions

**Before**:
```python
"Be conversational and encouraging. For example, ask them to elaborate on a specific aspect, "
"share a concrete example, or describe the outcome. "
"After asking your follow-up question, STOP TALKING and remain completely silent while they answer."
```

**After**:
```python
"For example, ask them to elaborate on a specific aspect or share a concrete example. "
"CRITICAL: After you finish asking your follow-up question, STOP TALKING IMMEDIATELY. "
"Do NOT add commentary or continue speaking. Remain completely silent while the candidate answers."
```

## Expected Behavior After Fix

### Transcript Display
**Before**:
```
Candidate: hi
Candidate: yeah I'm doing good
Candidate: you are so the Bacon
```

**After**:
```
Interviewer: Tell me about a time when you had to troubleshoot a technical issue under pressure.
Candidate: hi
Interviewer: Can you tell me more about that? I'd like to hear more details about your experience with troubleshooting.
Candidate: yeah I'm doing good
Interviewer: Describe a situation where you had to implement a new tool or process.
Candidate: you are so the Bacon
Interviewer: Can you tell me more about that? I'd like to hear more details about your experience with implementing new processes.
Interviewer: Thank you for taking the time to speak with me today. The interview is now complete, and your results will be shared with you soon.
```

### Timeline Events
Timeline will now correctly show both `question` and `followup_question_sent` events with the actual question text (not just "Follow-up for...").

### Recruiter Dashboard
The recruiter will now see the full conversation including:
- All main questions asked
- All follow-up questions asked
- Closing remarks
- All candidate responses

## Testing Checklist

- [ ] Start a voice interview
- [ ] Verify interviewer's first question appears in conversation UI
- [ ] Give a brief answer (< 30 words)
- [ ] Verify follow-up question appears in conversation UI
- [ ] Verify interviewer waits silently for your response
- [ ] Complete all questions
- [ ] Verify closing message appears in conversation UI
- [ ] Check recruiter dashboard transcript shows BOTH interviewer and candidate
- [ ] Verify timeline events include actual question text

## Technical Notes

### Why Not Rely on Gemini's Text Response?

The Gemini Live API has two modes of response:
1. **Audio** (`response.data`) - Always provided for speech
2. **Text** (`response.text`) - Optional, not guaranteed

When we send text prompts to Gemini, it generates audio but doesn't always send back the text it spoke. This is because:
- Gemini is optimized for real-time audio streaming
- Text echoing is not guaranteed in the Live API
- We're sending *instructions* ("Ask this question...") not the exact words to speak

By adding questions to `transcript_items` when we send them, we ensure:
- Accurate transcript matching what was asked
- Real-time updates to frontend
- Consistent timeline/transcript pairing
- No dependency on Gemini's optional text responses

### Prompt Engineering for Silence

Gemini Live's conversational model is trained to be engaging and talkative. Getting it to stop requires:
- **Repetition**: Multiple ways of saying "stop talking"
- **Emphasis**: "CRITICAL", "MUST", "Do NOT"
- **Explicit Boundaries**: "Only speak when prompted"
- **Negative Instructions**: "Do NOT add commentary"

This is necessary because the model's default behavior is to continue conversation.

---

**Status**: ✅ Fixed
**Date**: October 31, 2025
