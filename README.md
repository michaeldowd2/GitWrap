# GitWrap - WORK IN PROGRESS

## What is this?
An ultra-low maintainance javascript site generator for public github repositories.
- Online site generator to use with a public github repo: for free, no sign-up, no install and instantly get a sharable link. 
- Or if using github pages you can copy the index.html file to your own repo and update the REPO constant for a nicer URL.

## Why?
I had content and project results that I wanted to put in some websites and share with people, but I didn't want to have to spend time updating these sites or paying for to keep them online. Enter GitWrapper: which leverages github's API and free file hosting to dynamically build sites based on public github repos.

## How?
Using javascript calls to the github api, the GitWrapper retrieves a list of folders and content from the provided repo, then dresses these up in some html and css for presenting to the world. All of it happens client-side in javascript so the GitWrapper generator can be hosted in a free github.io page.
From the link above, GitWrapper will create a sharable URL for the selected repo by appending a query string to the URL for this repo's github page. However if you want to use your own URL, the index.html can be used anywhere (like in your own repo with github pages enabled) and updated to point at any public repository.

