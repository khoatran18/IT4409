import { register } from './registry'

register({
  type: 'Text',
  label: 'Text',
  category: 'Basic',
  props: {
    content: { type: 'string', default: 'Text' },
    size: { type: 'enum', options: ['sm', 'md', 'lg'], default: 'md' },
    weight: { type: 'enum', options: ['normal', 'bold'], default: 'normal' },
  },
  events: [],
  template: 'src/components/Text.tsx.hbs',
})

register({
  type: 'Heading',
  label: 'Heading',
  category: 'Basic',
  props: {
    text: { type: 'string', default: 'Tiêu đề' },
    level: { type: 'number', default: 2 },
  },
  events: [],
  template: 'src/components/Heading.tsx.hbs',
})

register({
  type: 'Button',
  label: 'Button',
  category: 'Basic',
  props: {
    text: { type: 'string', default: 'Button' },
    variant: { type: 'enum', options: ['primary', 'secondary'], default: 'primary' },
    disabled: { type: 'boolean', default: false },
  },
  events: ['onClick'],
  template: 'src/components/Button.tsx.hbs',
})

register({
  type: 'Input',
  label: 'Input',
  category: 'Basic',
  props: {
    label: { type: 'string' },
    placeholder: { type: 'string' },
    type: { type: 'enum', options: ['text', 'number', 'password', 'email'], default: 'text' },
    bindField: { type: 'string' },
  },
  events: ['onChange'],
  template: 'src/components/Input.tsx.hbs',
})

register({
  type: 'Select',
  label: 'Select',
  category: 'Basic',
  props: {
    label: { type: 'string' },
    options: { type: 'stringList' },
    entity: { type: 'entityRef' },
    bindField: { type: 'string' },
  },
  events: ['onChange'],
  template: 'src/components/Select.tsx.hbs',
})

register({
  type: 'Checkbox',
  label: 'Checkbox',
  category: 'Basic',
  props: {
    label: { type: 'string' },
    bindField: { type: 'string' },
  },
  events: ['onChange'],
  template: 'src/components/Checkbox.tsx.hbs',
})

register({
  type: 'Container',
  label: 'Container',
  category: 'Layout',
  props: {
    direction: { type: 'enum', options: ['column', 'row'], default: 'column' },
    gap: { type: 'number', default: 16 },
  },
  events: [],
  container: true,
  template: 'src/components/Container.tsx.hbs',
})

register({
  type: 'Card',
  label: 'Card',
  category: 'Layout',
  props: {
    title: { type: 'string' },
  },
  events: [],
  container: true,
  template: 'src/components/Card.tsx.hbs',
})

register({
  type: 'Table',
  label: 'Table',
  category: 'Data',
  props: {
    entity: { type: 'entityRef', required: true },
    columns: { type: 'fieldList', required: true },
    pageSize: { type: 'number', default: 10 },
    actions: { type: 'stringList', choices: ['edit', 'delete'], default: ['edit', 'delete'] },
  },
  events: ['onRowClick'],
  template: 'src/components/Table.tsx.hbs',
})

register({
  type: 'Form',
  label: 'Form',
  category: 'Data',
  props: {
    entity: { type: 'entityRef', required: true },
    mode: { type: 'enum', options: ['create', 'edit'], default: 'create' },
    submitText: { type: 'string', default: 'Lưu' },
  },
  events: ['onSubmit'],
  template: 'src/components/Form.tsx.hbs',
})
