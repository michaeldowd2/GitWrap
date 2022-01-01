# GitWrap

## What am I looking at?
GitWrap uses the github API and javascript to build a bootstrap website from a public repo or folder in github. It's essentially a bootstrap suit for github content. It all happens in the client browser, so no installation or registration is required, just point it at a repo, press build and copy the generated URL.

## Why?
If you have some image, audio or youtube content that you want to pull together onto a website, but not pay for hosting or spend time messing around with a CMS, you can use git + a github account + gitwrap to create a basic bootstrap frontend for your content.

## How?
Using javascript calls to the github api, GitWrap retrieves a list of folders and content from the specified repo, then dresses these up in some bootstrap html for presenting to the world. All of it happens client-side in javascript so the generator can be hosted and run for free with github.io pages.

## Examples
### 1. URL Forwarding -> Gitwrap generated URL -> public github repo

http://michaeldowd.info

This is my own content site. To set it up I went to the GitWrap generator, entered my username and the repo hosting my content and clicked build. I then pasted the generated URL into the forwarding section of my domain hosting.

### 2. URL Forwarding -> Gitwrap generated URL -> public github repo -> specific folder in repo

http://projecternest.com

Same as above but pointing to a specific folder in the same repo. This way I can just update the content in one place, commit and push changes and both sites are automatically updated


