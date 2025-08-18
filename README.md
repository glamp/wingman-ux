# Wingman

Wingman is a UX assistant that helps provide high quality feedback that is easy to reproduce. It is dev and agent friendly. It makes it easy to provide great feedback that is actionable and makes it easy to fix bugs or UX issues.

It allows you to make corrections and anotations about the UX of an application and then send that feeback to a remote endpoint. The feedback contains whatever the user specified as well as metadata about the page, the state the page is in, console logs, network logs, etc. that are helpful for debugging/reproducing the issue and then implementing the proper fix.

The most important use-case is for Claude Code. A dev leverages Wingman to provide feedback to Claude Code. Instead of doing the workflow Anthropic recommends (screenshot then drag it into the console), this will streamline that UX while also providing more context for Claude Code.

It can hook into front-end frameworks (start with React) to copy the exact state, components, etc. so that it is very easy to reproduce the exact issue that has been identified by the user. It's possible there might need to be a package that the user brings into their project so that Wingman can do this.

## Implementation

### Methodology
I want to build this from the "demo up". To start, we'll make a demo react project with create-react-app (or whatever is d'jour). Then we'll build Wingman into this demo and gradually add functionality.

### Tech
This will be heavily dependent on Distribution(#Distribution).

Generally speaking...
- Keep the code as simple as possible
- Work in a typed language

### Distribution
I'm not entirely sure what to do here. There are benefits for all of the methods below. I think I like the Mac App the best. I find I'm making tons of screenshots for Claude and it seems like kind of a bad workflow. I think we can do better than that.

For the Mac App, The big consideration is going to be how to get the data. Since the Mac App isn't integrated directly with the web app, we're going to need a way to get the DOM and React data. As long as this is possible then I think this is a good solution

A think a likely long-term solution would be to support both the Mac App and the Web App Plugin.

### Web App Plugin
This would be Intercom style. There would be a little Tool icon that is auto-displayed by Wingma in the bottom left. The user could click it and there would be a series of tools they can use create annotations.

#### Pros
- Overall pretty simple. Probably what people would expect.
- Easy to install. `npm install wingman` and you're up and running.
- Could integrate "deeper" into React and expose more state data for individual components.

#### Cons
- HTML fuckery since we're going to be injecting our own widget into the page.
- Screenshots are going to be imperfect. I don't think there's a foolproof way around this.
- Not able to annotate things outside the web app.

### Chrome Extension
Nearly the same as the Web App, but it would be distributed via Chrome Extension. With the little button being on your Chrome toolbar instead of having the the little icon embedded within the web application (though maybe you could do both?).

#### Pros
- Could get a better screenshot.

#### Cons
- A little "further" from the application/DOM/etc.
- More complicated install. Though fairly straightforward. Plenty of examples.

### Desktop App
This would be a toolbar style Mac app. Click it and there's a simple menu. But we'd do a keyboard shortcut so that the annotation thing is easy to invoke.

#### Pros
- Could get a better screenshot.
- Better for mobile.
- Could get access to the user's machine
- Could annotate more than just the web application
- Best keyboard shortcuts

#### Cons
- Most difficult to get the DOM and React data
- Most complicated to distribute, install, and update

## UX
The tool should be build using other libraries. We want to prioritize the code being simple (I don't care about "bloat" or bundle size). For example, you should use React.

### Annotation Tool
The user needs to be able to select a "box" on the screen by either doing a drag/drop (same as the shift+cmd+3 in mac Screenshot tool) to grab an arbitrary part of the screen OR the user needs to be able to click on an HTML/DOM element on the page (in this workflow, after the annotation tool is activated, they'd hover over various elements and there would be an outline indicating what they're on, then the user would click to select that element).

After selecting something to annotate, the user will add a text description of their annotation in a little text box. After writing thier description, they can click "Send" to send. This will invoke the webhook with the payload. Or the user can click "Cancel" to cancel their annotation.

### Look and Feel
We're going for professional, sleek, and minimal. Think the OpenAI Canvas toolbar widget. Color palette should be monochrome black/dark grey/grey/silver.

## Usage
As a developer, I want to...

Easily add Wingman into my React app:

```jsx
import { WingmanProvider, WingmanConfig } from 'wingman';

const config: WingmanConfig  = {
    enabled: true, // whether or not to send the payload. could be set to false for production
    destination: 'console.log' | 'http://localhost:3456/api' | '<some other URL>', // destination for the Annotation
}

export const Main: React.FC<Props> = () => {
  return (
    <WingmanProvider config={config}>
      <App />
    </WingmanProvider>
  );
};
```

If need be, I can provide a way let Wingman know about each component, the state, etc. As a developer, I'm willing to add some extra code to my application if it means that Wingman will be able to provide more reproducible context in the payload.

After annotating, Wingman will send the following payload to a webhook:

```jsx
interface Annotation {
  // uild style
  id: string;
  type: string;
  // position of element clicked by the user
  x: number;
  y: number;
  // size of element clicked by the user
  width: number;
  height: number;
  // text from the user's annotation
  text: string;
  timestamp: number;
  // the HTML DOM element clicked by the user
  element: {
    id: string;
    tagName: string;
    className?: string;
    textContent?: string;
    selector?: string;
    xpath?: string;
    attributes?: Record<string, string>;
    boundingRect?: { x: number; y: number; width: number; height: number };
  };
  /**
   * Specific React info about what was clicked. Includes metadata such as the
   * component name, component filename, props, state, etc. It needs to be enough so
   * that whatever the user is seeing can be reproduced.
   */
  reactComponent?: ReactComponent;
}
```

