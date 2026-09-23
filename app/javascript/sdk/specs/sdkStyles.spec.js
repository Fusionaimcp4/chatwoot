import { SDK_CSS } from '../sdk';

describe('SDK_CSS widget layouts', () => {
  it('hides the external close bubble in desktop layouts', () => {
    expect(SDK_CSS).toMatch(
      /@media only screen and \(min-width: 668px\)[\s\S]*?\.woot-widget-bubble\.woot--close \{[\s\S]*?opacity: 0;[\s\S]*?pointer-events: none;[\s\S]*?visibility: hidden !important;/
    );
  });

  it('keeps compact tall and narrower than expanded', () => {
    expect(SDK_CSS).toContain(
      '.woot-widget-holder.woot-widget-layout--compact {\n    height: min(70vh, calc(100vh - 40px));\n    width: clamp(23.5rem, 29vw, 25rem) !important;'
    );
    expect(SDK_CSS).toContain(
      '.woot-widget-holder.woot-widget-layout--expanded {\n    height: min(70vh, calc(100vh - 40px));\n    width: clamp(520px, 48vw, 620px) !important;'
    );
  });

  it('positions the desktop card independently of the launcher', () => {
    expect(SDK_CSS).toContain('bottom: 20px;');
    expect(SDK_CSS).toContain(
      'max-height: calc(100vh - 40px) !important;'
    );
  });

  it('preserves the mobile full-screen treatment', () => {
    expect(SDK_CSS).toMatch(
      /@media only screen and \(max-width: 667px\) \{[\s\S]*?\.woot-widget-holder \{\s+height: 100%;\s+right: 0;\s+top: 0;\s+width: 100%;/
    );
  });
});
