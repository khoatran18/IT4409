import { register } from './registry'

register({
  type: 'Text',
  label: 'Text',
  props: {
    content: { type: 'string', default: 'Text' },
    size: { type: 'enum', options: ['sm', 'md', 'lg'], default: 'md' },
    weight: { type: 'enum', options: ['normal', 'bold'], default: 'normal' },
  },
  events: [],
  template: 'src/components/Text.tsx.hbs',
})

register({
  type: 'Button',
  label: 'Button',
  props: {
    text: { type: 'string', default: 'Button' },
    variant: { type: 'enum', options: ['primary', 'secondary'], default: 'primary' },
    disabled: { type: 'boolean', default: false },
  },
  events: ['onClick'],
  template: 'src/components/Button.tsx.hbs',
})

register({
  type: 'Container',
  label: 'Container',
  props: {
    direction: { type: 'enum', options: ['column', 'row'], default: 'column' },
    gap: { type: 'number', default: 16 },
  },
  events: [],
  container: true,
  template: 'src/components/Container.tsx.hbs',
})
