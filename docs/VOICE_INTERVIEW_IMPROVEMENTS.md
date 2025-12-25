# Voice Interview Experience Improvements

## Overview
This document summarizes the improvements made to the voice interview feature to enhance the candidate experience by focusing on behavioral questions, intelligent follow-ups, and natural conversational flow.

## Key Issues Addressed

### 1. **Questions Too Technical**
- **Problem**: Candidates were being asked deep technical/algorithm questions inappropriate for voice interviews
- **Solution**: Rewrote question generation to focus on behavioral/STAR method questions

### 2. **No Follow-Up Questions**
- **Problem**: When candidates gave brief answers, the interviewer moved on immediately
- **Solution**: Implemented intelligent follow-up system that detects brief answers and asks contextual follow-ups

### 3. **Interviewer Doesn't Wait for Answers**
- **Problem**: Gemini would continue talking or interrupt candidates
- **Solution**: Updated all prompts to explicitly include "STOP TALKING and remain silent" instructions

## Configuration Changes

### New Environment Variables (`backend/env.example`)

```bash
# Voice Interview Question Style
VOICE_INTERVIEW_STYLE=behavioral  # Options: behavioral, technical, mixed

# Follow-up Question Settings
VOICE_INTERVIEW_ALLOW_FOLLOWUPS=True
VOICE_INTERVIEW_MAX_FOLLOWUPS_PER_QUESTION=1
VOICE_INTERVIEW_MIN_ANSWER_LENGTH=30  # words
```

### Updated Settings (`backend/app/core/config.py`)

- `VOICE_INTERVIEW_STYLE`: Controls question generation style (behavioral/technical/mixed)
- `VOICE_INTERVIEW_ALLOW_FOLLOWUPS`: Enable/disable intelligent follow-ups
- `VOICE_INTERVIEW_MAX_FOLLOWUPS_PER_QUESTION`: Limit follow-ups per main question
- `VOICE_INTERVIEW_MIN_ANSWER_LENGTH`: Word count threshold to trigger follow-ups
- `VOICE_INTERVIEW_GREETING`: Updated to emphasize natural conversation and silence

## Code Changes

### 1. Question Generation (`backend/app/services/ai_screening.py`)

**Behavioral Question Style** (default):
- Focus on real-world scenarios and past experiences
- STAR method (Situation, Task, Action, Result)
- Avoids deep technical or algorithm questions
- Encourages storytelling and concrete examples

**Example Prompt Improvements**:
```python
behavioral_instructions = """
Generate BEHAVIORAL interview questions focused on:
- Real-world scenarios and past experiences
- STAR method (Situation, Task, Action, Result)
- Interpersonal skills and teamwork
- Problem-solving approaches (NOT algorithms)
- Decision-making and leadership

AVOID:
- Deep technical implementation details
- Algorithm/coding problems
- Yes/no questions
- Overly academic or theoretical questions

Make questions conversational and story-oriented.
"""
```

### 2. Session Tracking (`backend/app/services/voice_interview.py`)

**New Instance Variables**:
- `followup_count_per_question: Dict[str, int]` - Tracks follow-ups per question
- `last_answer_word_count: int` - Stores word count of last answer
- `conversation_history: List[Dict]` - Full conversation context with word counts

### 3. Intelligent Follow-Up Logic

**Flow**:
1. Candidate provides answer
2. System calculates word count
3. Checks if answer < MIN_ANSWER_LENGTH (30 words)
4. Checks if follow-up quota not exceeded for this question
5. If conditions met, generates contextual follow-up
6. Otherwise, proceeds to next main question

**Implementation** (`handle_candidate_turn` method):
```python
# Calculate word count
word_count = len(sanitized.split())
self.last_answer_word_count = word_count

# Track conversation history
self.conversation_history.append({
    "question": current_question,
    "answer": sanitized,
    "word_count": word_count,
})

# Intelligent follow-up decision
should_followup = await self._should_send_followup(sanitized, word_count)

if should_followup:
    await self._send_followup_question(sanitized)
else:
    await self._send_next_question()
```

### 4. Follow-Up Question Generation

**Context-Aware Prompts**:
```python
followup_prompt = (
    f"The candidate gave a brief answer: '{previous_answer}'. "
    f"Ask ONE natural follow-up question to get more details about their experience with: '{current_question}'. "
    f"Be conversational and encouraging. For example, ask them to elaborate on a specific aspect, "
    f"share a concrete example, or describe the outcome. "
    f"After asking your follow-up question, STOP TALKING and remain completely silent while they answer."
)
```

### 5. Improved Gemini Prompts

**Main Question Prompt** (`_send_next_question`):
```python
prompt = (
    f"Ask the following question in a natural, conversational way. "
    f"After asking, STOP TALKING and wait silently for the candidate to respond completely. "
    f"Do not add commentary or follow-ups yet."
)
```

**Priming Session** (`_prime_session`):
```python
system_instruction = (
    f"You are an empathetic, professional interviewer conducting a {style} interview "
    f"for the role of {role_title}. Ask ONE question at a time in a warm, conversational tone. "
    f"After asking each question, STOP TALKING and remain completely silent while the candidate answers. "
    f"Do not interrupt or speak until they finish their response. "
    f"If their answer is very brief (under 2-3 sentences), ask ONE natural follow-up to encourage elaboration. "
    f"Use their name ({candidate_name}) naturally but not excessively."
)
```

## Timeline Event Tracking

New timeline events for debugging and analytics:
- `followup_question_sent`: Includes original question and brief answer that triggered it
- Enhanced `candidate_response`: Now includes word count in metadata

**Example Timeline Entry**:
```json
{
  "event_type": "followup_question_sent",
  "role": "assistant",
  "text": "Follow-up for: Tell me about a time you faced a challenging team conflict",
  "extra": {
    "original_question": "Tell me about a time you faced a challenging team conflict",
    "brief_answer": "I talked to both people."
  }
}
```

## Usage Example

### Testing the Improvements

1. **Start an Interview** with default settings (behavioral style, follow-ups enabled)
2. **Give Brief Answer** (e.g., "I worked on a project" - 5 words)
3. **Expect Follow-Up**: System should detect answer < 30 words and ask contextual follow-up
4. **Give Detailed Answer** (35+ words)
5. **Expect Next Question**: System should proceed to next main question

### Expected Behavior

**Scenario 1: Brief Answer**
```
Interviewer: "Tell me about a time you demonstrated leadership in a team project."
Candidate: "I led a team once."  [5 words]
🔄 System detects brief answer
Interviewer: "That's interesting! Can you share more details about the project - what was the situation and what specific actions did you take as a leader?"
```

**Scenario 2: Detailed Answer**
```
Interviewer: "Describe a challenging technical problem you solved."
Candidate: "In my last role, I was tasked with optimizing our database queries because page load times were exceeding 5 seconds. I analyzed the slow query logs, identified N+1 queries, implemented eager loading, and added strategic indexes. This reduced load times to under 1 second and improved user satisfaction scores by 30%."  [45 words]
✅ System accepts answer as sufficient
Interviewer: "Let's move on. Tell me about a time you had to learn a new technology quickly."
```

## Configuration Tuning

### Conservative Settings (Fewer Follow-Ups)
```bash
VOICE_INTERVIEW_MIN_ANSWER_LENGTH=20  # Lower threshold
VOICE_INTERVIEW_MAX_FOLLOWUPS_PER_QUESTION=1
VOICE_INTERVIEW_ALLOW_FOLLOWUPS=True
```

### Aggressive Settings (More Follow-Ups)
```bash
VOICE_INTERVIEW_MIN_ANSWER_LENGTH=50  # Higher threshold
VOICE_INTERVIEW_MAX_FOLLOWUPS_PER_QUESTION=2
VOICE_INTERVIEW_ALLOW_FOLLOWUPS=True
```

### Technical Interview Focus
```bash
VOICE_INTERVIEW_STYLE=technical
VOICE_INTERVIEW_MIN_ANSWER_LENGTH=40
```

### Behavioral Interview Focus (Recommended)
```bash
VOICE_INTERVIEW_STYLE=behavioral
VOICE_INTERVIEW_MIN_ANSWER_LENGTH=30
```

## Logging and Debugging

Key log messages to watch:
- `"Answer too brief (X words < Y), will send follow-up"`
- `"Already sent N follow-ups for question #X, skipping"`
- `"Generating follow-up for question #X (attempt Y)"`
- `"Session X queued next question after receiving response"`

## Benefits

1. **Better Candidate Experience**:
   - More relevant, conversational questions
   - Natural follow-up prompts encourage detailed answers
   - No interruptions during responses

2. **Higher Quality Insights**:
   - STAR method questions elicit structured, detailed responses
   - Follow-ups ensure candidates provide sufficient context
   - Conversation history enables better scoring

3. **Flexible Configuration**:
   - Adjust question style per role type
   - Tune follow-up thresholds based on interview goals
   - Enable/disable follow-ups as needed

4. **Production Ready**:
   - Comprehensive logging for debugging
   - Timeline tracking for analytics
   - Configurable limits prevent runaway follow-ups

## Testing Checklist

- [ ] Interview starts with warm greeting
- [ ] Questions are behavioral/STAR-focused (not deep technical)
- [ ] Interviewer stops talking after asking question
- [ ] Brief answer (< 30 words) triggers follow-up
- [ ] Follow-up is contextual and encouraging
- [ ] Detailed answer (30+ words) proceeds to next question
- [ ] Maximum 1 follow-up per question enforced
- [ ] Interview finalizes automatically after all questions
- [ ] Transcript includes all questions and follow-ups
- [ ] Timeline events include follow-up metadata

## Future Enhancements

Potential improvements:
- **Sentiment Analysis**: Adjust follow-up based on candidate confidence
- **Dynamic Thresholds**: Adjust word count threshold per question type
- **Answer Quality Scoring**: Use semantic analysis instead of just word count
- **Adaptive Questioning**: Generate follow-ups based on answer quality, not just length
- **Multi-Turn Conversations**: Allow more natural back-and-forth on complex topics

---

**Last Updated**: 2025
**Status**: ✅ Complete and Ready for Testing
