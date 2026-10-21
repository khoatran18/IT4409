import { beforeAll, describe, expect, it } from 'vitest'
import { defaultProps, get, list, missingRequired, register } from '.'

describe('registry', () => {
  it('đăng ký sẵn Button, Text, Container', () => {
    expect(list().map((d) => d.type).sort()).toEqual(['Button', 'Container', 'Text'])
  })

  it('chỉ Container chứa được con', () => {
    expect(get('Container')?.container).toBe(true)
    expect(get('Button')?.container).toBeFalsy()
  })

  it('không đăng ký trùng type', () => {
    expect(() => register({ type: 'Button', label: 'x', props: {}, events: [], template: '' })).toThrow()
  })

  it('defaultProps điền giá trị mặc định', () => {
    expect(defaultProps('Button')).toEqual({ text: 'Button', variant: 'primary', disabled: false })
    expect(defaultProps('Unknown')).toEqual({})
  })

  describe('missingRequired', () => {
    beforeAll(() => {
      register({
      type: 'TestTable',
      label: 'TestTable',
      props: {
        entity: { type: 'entityRef', required: true },
        columns: { type: 'fieldList', required: true },
        pageSize: { type: 'number', default: 10 },
      },
      events: [],
      template: '',
      })
    })

    it('báo prop bắt buộc còn thiếu hoặc rỗng', () => {
      expect(missingRequired({ type: 'TestTable', props: { columns: [] } })).toEqual(['entity', 'columns'])
    })

    it('đủ prop thì không báo', () => {
      expect(missingRequired({ type: 'TestTable', props: { entity: 'Student', columns: ['name'] } })).toEqual([])
    })

    it('component không có prop bắt buộc', () => {
      expect(missingRequired({ type: 'Button', props: {} })).toEqual([])
    })
  })
})
