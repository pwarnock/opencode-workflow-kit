# Discovery
This document captures the raw, unfiltered idea or initial AI prompt that sparked the project.

## Starting Prompt
**USER:** a collection of configs for opencode that can be shared and installed on multiple machines and projects similar to what others do in OpenCode and Claude Code communities

## Questions

**AGENT Q1:** Who is the target audience for this opencode config collection? Are these primarily for individual developers, teams, or organizations?  
**USER A1:** opencode users

**AGENT Q2:** What specific types of configurations would be included in this collection? For example, are we talking about AI agent configurations, build tools, linting rules, development environment settings, or something else entirely?  
**USER A2:** agent configurations, mcp, permission, etc

**AGENT Q3:** How do you envision users installing and using these configs? Should it be a simple one-command install, a git clone, a package manager approach, or something else?  
**USER A3:** cross platform, global and/or project, open to iterative suggestions. start simple with README to copy and supporting things like env files etc

**AGENT Q4:** What problem does this solve for opencode users? Are they currently struggling with setting up consistent configurations across machines, sharing best practices, or something else?  
**USER A4:** i work on at least two different machines and several projects and find myself recreating

**AGENT Q5:** What would success look like for this project? How would you measure that it's working well for users?  
**USER A5:** primary: it's used secondary: it's shared

**AGENT Q6:** What are the must-have features for version 1.0? What's the minimum viable product that would be useful?  
**USER A6:** consistent config released to github and installed on both machines

**AGENT Q7:** Are there any existing solutions or similar projects in the Claude Code or other AI coding communities that you're inspired by or want to differentiate from?  
**USER A7:** i don't necessarily want to emulate, but this is close to my original thoughts. simple. https://github.com/solatis/claude-config i'm open to iterating towards more elaborate solutions

**AGENT Q8:** What constraints should we keep in mind? Are there any technical limitations, compatibility requirements, or boundaries we should work within?  
**USER A8:** cross platform. i guess opencode config is pretty standardized with ~/.config/opencode

**AGENT Q9:** What are the primary use cases you envision? For example, someone setting up a new machine, someone starting a new project, someone wanting to try someone else's setup, or all of the above?  
**USER A9:** all of the boave but someone else's setup is least important

## Discovery Summary
This project aims to create a shareable collection of opencode configurations that can be easily installed across multiple machines and projects. The target audience is opencode users who work across different machines and projects and face the pain point of recreating configurations repeatedly.

The solution will be a centralized, cross-platform config collection focusing on agent configurations, MCP settings, permissions, and other opencode configs. The approach starts simple with README-based installation instructions and supporting files like env files, with openness to iteration toward more sophisticated solutions.

Success is measured by primary usage (people actually using it) and secondary sharing (community adoption). The MVP for v1.0 is achieving consistent config deployment via GitHub to multiple machines. The project respects the standard ~/.config/opencode structure and prioritizes new machine setup and new project setup use cases over trying others' configurations.

The inspiration comes from similar claude-config projects but with a focus on simplicity and iterative improvement based on user feedback.