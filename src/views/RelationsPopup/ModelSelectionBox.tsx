import * as React from 'react'
import {Model} from '../../types/types'
import {Combobox} from 'react-input-enhancements'
import {$v} from 'graphcool-styles'
import HorizontalSelect from './HorizontalSelect'
import FieldNameInput from './FieldNameInput'
import BreakingChangeIndicator from './BreakingChangeIndicator'

interface Props {
  relatedFieldName: string | null
  relatedFieldType: string | null
  many: boolean
  models: Model[]
  selectedModel?: Model
  didSelectedModel: Function
  didChangeFieldName: (newFieldName: string) => void
  inputIsBreakingChange: boolean
  modelIsBreakingChange: boolean
  forbiddenFieldNames: string[]
  // messagesForBreakingChange: string[]
}

export default class ModelSelectionBox extends React.Component<Props, {}> {

  render() {

    const modelNames = this.props.models.map(model => model.name)

    let offsets: number[] = []
    let plain: boolean[] = []
    if (this.props.inputIsBreakingChange) {
      offsets.push(80)
      plain.push(true)
    }
    if (this.props.modelIsBreakingChange) {
      offsets.push(16)
      plain.push(true)
    }

    return (
      <div>
        <div className='buttonShadow br2'>
          <BreakingChangeIndicator
            className='br2'
            indicatorStyle='RIGHT'
            width={16}
            height={12}
            offsets={offsets}
            plain={plain}
          >
            <style jsx={true}>{`

          .titleText {
            @inherit: .f25, .fw6;
          }

        `}</style>
            <div className={`flex itemsCenter justifyBetween pv8 ph16
              ${this.props.selectedModel ? ' bgBlue' : ' bgBlue20'}`}
              style={{borderTopLeftRadius: '2px', borderTopRightRadius: '2px'}}
            >
              <Combobox
                value=''
                options={modelNames}
                onSelect={(value) => this.didSelectModelWithName(value)}
              >
                {inputProps => {
                  {/*console.log('input props', inputProps)*/}
                  return <input
                    type='text'
                    value={this.props.selectedModel ? this.props.selectedModel.name : 'Select Model'}
                    className={`titleText bgTransparent ${this.props.selectedModel ? 'white' : 'blue'}`}
                    style={{width: '180px'}}
                  />
                }}
              </Combobox>
            </div>
            <FieldNameInput
              relatedFieldName={this.props.relatedFieldName}
              relatedFieldType={this.props.relatedFieldType}
              didChangeFieldName={this.props.didChangeFieldName}
              forbiddenFieldNames={this.props.forbiddenFieldNames}
            />
          </BreakingChangeIndicator>
        </div>
        {this.props.many &&
        <div
          className='flex flexColumn itemsCenter z1'
          style={{height: '20px', width: '100%'}}>
          <div
            className='bgWhite'
            style={{
              boxShadow: '0px 1px 3px rgba(0,0,0,.15)',
              width: '95%',
              height: '10px',
              borderBottomRightRadius: '2px',
              borderBottomLeftRadius: '2px',
              zIndex: -1,
            }}
          />
          <div
            className='bgWhite'
            style={{
              boxShadow: '0px 1px 3px rgba(0,0,0,.15)',
              width: '90%',
              height: '8px',
              borderBottomRightRadius: '2px',
              borderBottomLeftRadius: '2px',
              zIndex: -2,
            }}
          />
        </div>
        }
      </div>
    )
  }

  private didSelectModelWithName = (modelName: string) => {
    const model = this.props.models.find((model) => model.name === modelName)
    this.props.didSelectedModel(model)
  }

}
