const { createTemplateEngine, defaultTemplate } = require('@wingman/shared');

// Create a test annotation with all the data
const testAnnotation = {
  id: 'test-123',
  note: 'The submit button is not aligned properly with the form fields',
  page: {
    url: 'http://localhost:5173/test',
    title: 'Test Page'
  },
  selector: {
    element: '<button>Submit</button>',
    xpath: '/html/body/div/button',
    css: 'button.submit-btn'
  },
  react: {
    component: 'SubmitButton',
    props: { disabled: false, loading: false },
    tree: 'App > Form > SubmitButton'
  },
  errors: [
    { message: 'TypeError: Cannot read property "value" of null', timestamp: Date.now() }
  ],
  console: [
    { level: 'log', args: ['Form submitted'], timestamp: Date.now() },
    { level: 'warn', args: ['Missing validation'], timestamp: Date.now() }
  ],
  network: [
    {
      url: '/api/submit',
      method: 'POST',
      status: 404,
      duration: 234
    }
  ],
  screenshotUrl: 'data:image/png;base64,SAMPLE_SCREENSHOT',
  createdAt: new Date().toISOString()
};

async function testTemplate() {
  const templateEngine = createTemplateEngine();

  try {
    const formatted = await templateEngine.processTemplate(
      defaultTemplate,
      testAnnotation,
      { relayUrl: 'https://api.wingmanux.com' }
    );

    console.log('=== FORMATTED TEMPLATE OUTPUT ===\n');
    console.log(formatted);
    console.log('\n=== END OUTPUT ===');

    // Check for key sections
    const sections = [
      'UI Feedback',
      'Page Context',
      'Element Details',
      'React Component',
      'Console Logs',
      'Errors',
      'Network',
      'Screenshot'
    ];

    console.log('\n=== SECTION CHECK ===');
    sections.forEach(section => {
      const included = formatted.includes(section);
      console.log(`${included ? '✅' : '❌'} ${section}`);
    });

  } catch (error) {
    console.error('Error processing template:', error);
  }
}

testTemplate();