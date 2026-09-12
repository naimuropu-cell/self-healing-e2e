import { test as base, expect } from '@playwright/test';
import { extendWithAutoHeal, SelfHealingDescriptor } from 'playwright-autoheal';

// ১. Playwright-কে Self-Healing ইঞ্জিন দিয়ে এক্সটেন্ড করা
const test = extendWithAutoHeal(base);

test.describe('YES Bangladesh Live Website — Automation & Self-Healing', () => {

  test('should navigate to YES Bangladesh and verify homepage with self-healing locators', async ({
    autoheal,
  }) => {
    // ২. লাইভ ওয়েবসাইটে প্রবেশ করা
    await autoheal.goto('https://yesbangladesh.net/', { waitUntil: 'domcontentloaded', timeout: 30000 });

    // ৩. টাইটেল ভেরিফাই করা
    await expect(autoheal).toHaveTitle(/Yes Bangladesh/i);

    // ৪. সেলফ-হিলিং লোগো ব্র্যান্ডিং ডিসক্রিপ্টর
    const logoDescriptor: SelfHealingDescriptor = {
      name: 'YES Bangladesh Header Logo',
      // প্রাইমারি যদি কোনোদিন বদলে যায়:
      primary: { type: 'css', value: '.uicore-branding img' },
      // তাহলে স্বয়ংক্রিয়ভাবে ফলব্যাক থেকে রিকভার করবে:
      fallbacks: [
        { type: 'css', value: '.uicore-logo' },
        { type: 'role', value: 'link', options: { name: /yes/i } },
        { type: 'css', value: 'header a img' },
      ],
      aiHint: 'The official header company logo of YES Bangladesh',
    };

    // ৫. সেলফ-হিলিং পদ্ধতিতে লোগো এলিমেন্ট পাওয়া ও চেক করা
    const logo = await autoheal.heal(logoDescriptor);
    await expect(logo.first()).toBeVisible();

    // ৬. সেলফ-হিলিং হিরো / কন্টেন্ট সেকশন ভেরিফিকেশন
    const heroContentDescriptor: SelfHealingDescriptor = {
      name: 'Homepage Main Content Area',
      primary: { type: 'css', value: '#content' },
      fallbacks: [
        { type: 'css', value: '#primary' },
        { type: 'css', value: '.uicore-body-content' },
        { type: 'css', value: 'main' },
      ],
      aiHint: 'The main hero container or content area on the homepage',
    };

    const content = await autoheal.heal(heroContentDescriptor);
    await expect(content.first()).toBeVisible();
  });

});
