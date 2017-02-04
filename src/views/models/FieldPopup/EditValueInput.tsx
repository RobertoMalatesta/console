import * as React from 'react'
import Icon from 'graphcool-styles/dist/components/Icon/Icon'
import {CellRequirements, getScalarEditCell} from '../DatabrowserView/Cell/cellgenerator'
import {TypedValue} from '../../../types/utils'
import {Field} from '../../../types/types'
import {valueToString} from '../../../utils/valueparser'

interface State {
  isEnteringValue: boolean
  isHoveringValue: boolean
}

interface Props {
  value: TypedValue
  onChangeValue: any
  projectId: string
  field: Field
  placeholder?: string
}

export default class EditValueInput extends React.Component<Props, State> {

  state = {
    isEnteringValue: false,
    isHoveringValue: false,
  }

  render() {

    const {isEnteringValue} = this.state
    const {value, placeholder, field} = this.props

    return (
      <div className='container'>
        <style jsx={true}>{`

          .container {
            @p: .bgWhite;
          }
          .valueInputField {
            @p: .f16, .w100;
            color: rgba(42,127,211,1);
          }

          .edit-value {
            height: 26px;
          }

        `}</style>
        {isEnteringValue ?
          (
            <div className='flex itemsCenter bbox edit-value'>
              {this.getInput()}
            </div>
          )
          :
          (!value) && (
            <div
              className='flex itemsCenter pointer bbox edit-value'
              onClick={() => this.setState({
                isEnteringValue: true,
              } as State)}
            >
              <Icon
                src={require('../../../assets/icons/edit_circle_gray.svg')}
                width={26}
                height={26}
              />
              <div className='f16 black40 ml16'>
                {placeholder || 'add value'}
                <span className='black30'> (optional)</span>
              </div>
            </div>
          ) ||
          (value) && (
            <div
              className='flex itemsCenter pointer bbox edit-value '
              onMouseEnter={() => this.setState({isHoveringValue: true} as State)}
              onMouseLeave={() => this.setState({isHoveringValue: false} as State)}
              onClick={() => this.setState({
                isEnteringValue: true,
                isHoveringValue: false,
              } as State)}
            >
              <div className='f16 black50 pr6'>{valueToString(value, field, true)}</div>
              {this.state.isHoveringValue && (
                <Icon
                  className='ml6'
                  src={require('../../../assets/icons/edit_project_name.svg')}
                  width={20}
                  height={20}
                />
              )}
            </div>
          )
        }
      </div>
    )
  }

  private getInput() {
    const requirements: CellRequirements = {
      value: this.props.value,
      field: this.props.field,
      inList: true,
      projectId: this.props.projectId,
      methods: {
        save: this.props.onChangeValue,
        cancel: () => null,
        onKeyDown: () => {
          // on key down...
        },
      },
    }

    return getScalarEditCell(requirements)
  }

  private handleKeyDownOnFieldValue = (e) => {
    if (e.keyCode === 13) {
      this.setState({
        isEnteringValue: false,
      } as State)
    } else if (e.keyCode === 27) {
      this.setState({
        isEnteringValue: false,
      } as State)
    }
  }

}
