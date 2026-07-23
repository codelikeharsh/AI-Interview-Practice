"""
Static, curated question bank for the public Question Bank browse/practice
feature. Original content, not generated on demand - keeps browsing instant
and free, and the content is ours to control.
"""

QUESTION_BANK = [
    # ---------------- DSA ----------------
    {"id": "dsa-01", "category": "DSA", "difficulty": "easy",
     "text": "How would you check if a string is a palindrome, and what's the time complexity of your approach?"},
    {"id": "dsa-02", "category": "DSA", "difficulty": "easy",
     "text": "How would you find the two numbers in an unsorted array that sum to a given target, without using nested loops?"},
    {"id": "dsa-03", "category": "DSA", "difficulty": "medium",
     "text": "You're given 10 million integers with strict memory limits - which data structure would you use for fast duplicate detection, and why?"},
    {"id": "dsa-04", "category": "DSA", "difficulty": "medium",
     "text": "How would you decide between a heap, a balanced BST, and a hash map for tracking the top-k most frequent items in a stream?"},
    {"id": "dsa-05", "category": "DSA", "difficulty": "medium",
     "text": "How would you detect a cycle in a linked list without using extra memory for a visited set?"},
    {"id": "dsa-06", "category": "DSA", "difficulty": "medium",
     "text": "Given a solution that runs in O(n squared) for finding pairs with a given sum, how would you optimize it for large arrays?"},
    {"id": "dsa-07", "category": "DSA", "difficulty": "hard",
     "text": "How would you design an algorithm to find the median of a continuously growing stream of numbers efficiently?"},
    {"id": "dsa-08", "category": "DSA", "difficulty": "hard",
     "text": "How would you approach scheduling the maximum number of non-overlapping meetings from a large list of time intervals?"},
    {"id": "dsa-09", "category": "DSA", "difficulty": "hard",
     "text": "How would you design a rate limiter data structure that supports millions of requests per second with minimal memory overhead?"},

    # ---------------- OOP ----------------
    {"id": "oop-01", "category": "OOP", "difficulty": "easy",
     "text": "What's the practical difference between an abstract class and an interface, and when would you reach for each?"},
    {"id": "oop-02", "category": "OOP", "difficulty": "easy",
     "text": "How would you explain encapsulation to a junior developer using a real example from a codebase you've worked on?"},
    {"id": "oop-03", "category": "OOP", "difficulty": "medium",
     "text": "Where would you apply composition over inheritance in a real codebase, and what bug risk does that prevent?"},
    {"id": "oop-04", "category": "OOP", "difficulty": "medium",
     "text": "How would you design a notification system using OOP principles that supports email, SMS, and push without modifying existing classes?"},
    {"id": "oop-05", "category": "OOP", "difficulty": "medium",
     "text": "How would you refactor a large God class in production while preserving behavior and minimizing regression risk?"},
    {"id": "oop-06", "category": "OOP", "difficulty": "medium",
     "text": "How would you use the strategy pattern to replace a large chain of if-else statements picking behavior at runtime?"},
    {"id": "oop-07", "category": "OOP", "difficulty": "hard",
     "text": "How would you design a plugin architecture that lets third parties extend your application without touching its core code?"},
    {"id": "oop-08", "category": "OOP", "difficulty": "hard",
     "text": "How would you decide when a design pattern is solving a real problem versus adding unnecessary abstraction to a codebase?"},

    # ---------------- System Design ----------------
    {"id": "sysdes-01", "category": "System Design", "difficulty": "easy",
     "text": "How would you design a basic URL shortener, and what would you use to make short codes unique?"},
    {"id": "sysdes-02", "category": "System Design", "difficulty": "medium",
     "text": "How would you design a rate limiter for a public API that needs to handle bursty traffic fairly across users?"},
    {"id": "sysdes-03", "category": "System Design", "difficulty": "medium",
     "text": "How would you design a notification system that reliably delivers messages even if a downstream service is temporarily down?"},
    {"id": "sysdes-04", "category": "System Design", "difficulty": "medium",
     "text": "How would you design a system to detect and prevent duplicate payments when a client retries a request after a timeout?"},
    {"id": "sysdes-05", "category": "System Design", "difficulty": "hard",
     "text": "How would you design a chat application that needs to support millions of concurrent users with low message latency?"},
    {"id": "sysdes-06", "category": "System Design", "difficulty": "hard",
     "text": "How would you design a system for real-time collaborative editing, like multiple people typing in the same document at once?"},
    {"id": "sysdes-07", "category": "System Design", "difficulty": "hard",
     "text": "How would you design a globally distributed system so that users see consistent data even when data centers go down?"},
    {"id": "sysdes-08", "category": "System Design", "difficulty": "hard",
     "text": "How would you design a video streaming service's backend to handle both live streams and on-demand playback efficiently?"},

    # ---------------- Databases ----------------
    {"id": "db-01", "category": "Databases", "difficulty": "easy",
     "text": "What's the difference between a primary key and a unique constraint, and why would a table need both?"},
    {"id": "db-02", "category": "Databases", "difficulty": "easy",
     "text": "How would you decide whether a one-to-many relationship should be modeled with a foreign key or a join table?"},
    {"id": "db-03", "category": "Databases", "difficulty": "medium",
     "text": "A query on a 50 million row table is slow - how would you diagnose whether it's an indexing, query shape, or schema problem?"},
    {"id": "db-04", "category": "Databases", "difficulty": "medium",
     "text": "How do you decide between normalizing and denormalizing a schema for a system that reads far more than it writes?"},
    {"id": "db-05", "category": "Databases", "difficulty": "medium",
     "text": "How would you design transactions for an order workflow to avoid race conditions when two updates happen at once?"},
    {"id": "db-06", "category": "Databases", "difficulty": "hard",
     "text": "How would you shard a database that's outgrown a single instance, and how would you handle queries that span shards?"},
    {"id": "db-07", "category": "Databases", "difficulty": "hard",
     "text": "How would you migrate a production table's schema with zero downtime while writes are actively happening against it?"},
    {"id": "db-08", "category": "Databases", "difficulty": "hard",
     "text": "How would you design a caching layer in front of a database so stale data never gets served after a write?"},

    # ---------------- Frontend ----------------
    {"id": "fe-01", "category": "Frontend", "difficulty": "easy",
     "text": "What's the difference between controlled and uncontrolled form inputs in React, and when would you use each?"},
    {"id": "fe-02", "category": "Frontend", "difficulty": "easy",
     "text": "How would you improve the accessibility of a custom dropdown component built entirely from divs?"},
    {"id": "fe-03", "category": "Frontend", "difficulty": "medium",
     "text": "A React page rerenders excessively after every API response - how would you identify the cause and reduce unnecessary renders?"},
    {"id": "fe-04", "category": "Frontend", "difficulty": "medium",
     "text": "How would you structure state for a complex multi-step form wizard so validation stays predictable across steps?"},
    {"id": "fe-05", "category": "Frontend", "difficulty": "medium",
     "text": "When would you reach for a server-state library over local component state in a production React application?"},
    {"id": "fe-06", "category": "Frontend", "difficulty": "medium",
     "text": "How would you debug a memory leak in a single-page app that gets slower the longer a user keeps the tab open?"},
    {"id": "fe-07", "category": "Frontend", "difficulty": "hard",
     "text": "How would you architect code-splitting for a large frontend app so users only download what a given page actually needs?"},
    {"id": "fe-08", "category": "Frontend", "difficulty": "hard",
     "text": "How would you design a design-system component library so breaking changes don't ripple across dozens of consuming teams?"},

    # ---------------- Backend / APIs ----------------
    {"id": "be-01", "category": "Backend", "difficulty": "easy",
     "text": "What's the difference between PUT and PATCH in a REST API, and when would you use each?"},
    {"id": "be-02", "category": "Backend", "difficulty": "easy",
     "text": "How would you structure error responses in an API so client applications can handle failures predictably?"},
    {"id": "be-03", "category": "Backend", "difficulty": "medium",
     "text": "How would you design an idempotent payment API endpoint that's safe against retries and network timeouts?"},
    {"id": "be-04", "category": "Backend", "difficulty": "medium",
     "text": "Your API's latency spikes right after a new release - what metrics and debugging steps would you check first?"},
    {"id": "be-05", "category": "Backend", "difficulty": "medium",
     "text": "How would you version a public API while keeping backward compatibility for mobile clients that update slowly?"},
    {"id": "be-06", "category": "Backend", "difficulty": "medium",
     "text": "How would you design authentication for a system that needs to support both first-party apps and third-party integrations?"},
    {"id": "be-07", "category": "Backend", "difficulty": "hard",
     "text": "How would you design a background job system that guarantees a task runs exactly once, even if a worker crashes mid-execution?"},
    {"id": "be-08", "category": "Backend", "difficulty": "hard",
     "text": "How would you design service-to-service communication for a system moving from a monolith to microservices without a big-bang rewrite?"},

    # ---------------- Behavioral ----------------
    {"id": "beh-01", "category": "Behavioral", "difficulty": "easy",
     "text": "Tell me about a time you disagreed with a teammate on a technical decision and how you handled it."},
    {"id": "beh-02", "category": "Behavioral", "difficulty": "easy",
     "text": "Describe a situation where you had to meet a tight deadline. What did you do?"},
    {"id": "beh-03", "category": "Behavioral", "difficulty": "easy",
     "text": "Tell me about a time you made a mistake at work and how you recovered from it."},
    {"id": "beh-04", "category": "Behavioral", "difficulty": "medium",
     "text": "Describe a time you had to learn a completely new technology very quickly to get a task done."},
    {"id": "beh-05", "category": "Behavioral", "difficulty": "medium",
     "text": "Tell me about a time you had to give a teammate difficult feedback about their work."},
    {"id": "beh-06", "category": "Behavioral", "difficulty": "medium",
     "text": "Describe a situation where you had incomplete information but still had to make a call."},
    {"id": "beh-07", "category": "Behavioral", "difficulty": "hard",
     "text": "Tell me about a time you had to push back on a decision from leadership that you thought was wrong."},
    {"id": "beh-08", "category": "Behavioral", "difficulty": "hard",
     "text": "Describe a time priorities suddenly shifted mid-project. How did you and your team adapt?"},
]


def get_all_questions() -> list[dict]:
    return QUESTION_BANK


def get_question_by_id(question_id: str) -> dict | None:
    return next((q for q in QUESTION_BANK if q["id"] == question_id), None)
