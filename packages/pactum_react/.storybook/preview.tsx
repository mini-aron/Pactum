import type { Preview } from '@storybook/react';
import { configurePdfWorker } from '../src/configurePdfWorker';

configurePdfWorker();

const preview: Preview = {
  parameters: {
    layout: 'padded',
  },
};

export default preview;
