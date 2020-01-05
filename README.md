# GitWrap - WORK IN PROGRESS

## What is this?
An low maintainance javascript site generator for public github repositories.
- Online site generator to use with a public github repo: for free, no sign-up, no install and instantly get a sharable link. 
- Or if using github pages you can copy the index.html file to your own repo and update the REPO constant for a nicer URL.

## Why?
I had content and project results that I wanted to put in some websites and share with people, but I didn't want to have to spend time updating these sites or paying to keep them online. Enter GitWrap: it leverages github's API and free file hosting to dynamically build sites on top of public github repos.

## How?
Using javascript calls to the github api, GitWrap retrieves a list of folders and content from the specified repo, then dresses these up in some bootstrap html for presenting to the world. All of it happens client-side in javascript so the GitWrapper generator can be hosted in a free github.io page.

## Examples
### 1. URL Forwarding -> Gitwrap generated URL -> public github repo

https://michaeldowd.info

This is my own content site. To set it up I went to the GitWrap generator here: https://michaeldowd2.github.io/GitWrap/, entered my username and repo hosting my content and clicked build. I then pasted the generated URL into the forwarding section of my domain hosting.

### 2. URL Forwarding -> Gitwrap generated URL -> public github repo -> specific folder in repo

https://projecternest.com

Same as above but pointing to a specific folder in the same repo. This way I can just update the content in one place, commit and push changes and both sites are automatically updated


