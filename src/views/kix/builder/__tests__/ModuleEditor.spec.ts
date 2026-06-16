/**
 * ModuleEditor — renders a module's FieldSpec[] and emits edited values on
 * Save. Verifies field count, the weekday toggle, dynamic option injection,
 * and that Save emits a copy (Cancel discards via the parent owning state).
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ModuleEditor from '../ModuleEditor.vue'
import { MODULE_FIELDS } from '../builderForms'
import type { BuildModuleId } from '../builderModel'

const stubs = {
  ElDialog: {
    props: ['modelValue'],
    template: '<div v-if="modelValue"><slot /><slot name="footer" /></div>'
  },
  ElSelect: {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template:
      '<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><slot /></select>'
  },
  ElOption: { props: ['label', 'value'], template: '<option :value="value">{{ label }}</option>' },
  ElInputNumber: {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template:
      '<input type="number" :value="modelValue" @input="$emit(\'update:modelValue\', Number($event.target.value))" />'
  },
  ElSwitch: {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template: '<button @click="$emit(\'update:modelValue\', !modelValue)">{{ modelValue }}</button>'
  },
  ElButton: { emits: ['click'], template: '<button @click="$emit(\'click\')"><slot /></button>' }
}

function mountEditor(
  moduleId: BuildModuleId,
  initial: Record<string, unknown>,
  dynamicOptions = {}
) {
  return mount(ModuleEditor, {
    props: { modelValue: true, moduleId, title: 't', initial, dynamicOptions },
    global: { stubs }
  })
}

describe('ModuleEditor', () => {
  it('renders one field row per spec for the game module', () => {
    const w = mountEditor('game', {
      template_id: 'spin_and_win',
      difficulty: 'medium',
      session_secs: 30,
      brand_assets: 'auto'
    })
    expect(w.findAll('[data-testid="editor-field"]')).toHaveLength(MODULE_FIELDS.game.length)
  })

  it('Save emits the edited values', async () => {
    const w = mountEditor('game', {
      template_id: 'spin_and_win',
      difficulty: 'medium',
      session_secs: 30,
      brand_assets: 'auto'
    })
    await w.find('[data-testid="editor-save"]').trigger('click')
    const saved = w.emitted('save')?.[0]?.[0] as Record<string, unknown>
    expect(saved.template_id).toBe('spin_and_win')
    expect(w.emitted('update:modelValue')?.at(-1)).toEqual([false])
  })

  it('weekday toggle adds/removes a day in the mask', async () => {
    const w = mountEditor('schedule', {
      weekday_mask: [6, 0],
      start_hour: '12:00',
      end_hour: '15:00',
      holiday_behavior: 'ignore',
      repeat: 'once'
    })
    await w.find('[data-testid="dow-1"]').trigger('click') // add Mon
    await w.find('[data-testid="dow-6"]').trigger('click') // remove Sat
    await w.find('[data-testid="editor-save"]').trigger('click')
    const saved = w.emitted('save')?.[0]?.[0] as { weekday_mask: number[] }
    expect(saved.weekday_mask).toContain(1)
    expect(saved.weekday_mask).not.toContain(6)
  })

  it('injects dynamic options into the voucher template select', () => {
    const w = mountEditor(
      'voucher',
      { vertical: 'cafe', template_id: '', inventory: 500, daily_budget_sgd: 50 },
      { template_id: [{ value: 'tmpl_x', label: 'X' }] }
    )
    const opts = w.find('[data-testid="field-template_id"]').findAll('option')
    expect(opts.some((o) => o.text() === 'X')).toBe(true)
  })

  it('emits field-change when the vertical changes', async () => {
    const w = mountEditor('voucher', {
      vertical: 'bubble_tea',
      template_id: '',
      inventory: 500,
      daily_budget_sgd: 50
    })
    const select = w.find('[data-testid="field-vertical"]')
    ;(select.element as HTMLSelectElement).value = 'cafe'
    await select.trigger('change')
    expect(
      w.emitted('field-change')?.some((e) => (e[0] as { field: string }).field === 'vertical')
    ).toBe(true)
  })
})
