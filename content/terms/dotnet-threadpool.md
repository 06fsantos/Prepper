---
id: 01M195VTJ2EM37BAZN4JHYNQD7
title: The .NET thread pool
---

The machine that runs continuations and queued work items, and decides for itself how many
threads to keep alive to do it. Nothing about it is visible in the shape of your code — which
is why the failures it produces read as latency rather than as bugs.
