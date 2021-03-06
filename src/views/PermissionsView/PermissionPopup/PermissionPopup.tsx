import * as React from 'react'
import * as Relay from 'react-relay'
import { $p } from 'graphcool-styles'
import * as cx from 'classnames'
import { Project, Operation, UserType, Model, ModelPermission, PermissionRuleType } from '../../../types/types'
import mapProps from '../../../components/MapProps/MapProps'
import PopupWrapper from '../../../components/PopupWrapper/PopupWrapper'
import { withRouter } from 'react-router'
import styled from 'styled-components'
import PermissionPopupHeader from './PermissionPopupHeader'
import PermissionPopupFooter from './PermissionPopupFooter'
import OperationChooser from './OperationChooser'
import PermissionConditions from './PermissionConditions'
import AffectedFields from './AffectedFields'
import AddPermissionMutation from '../../../mutations/ModelPermission/AddPermissionMutation'
import UpdatePermissionMutation from '../../../mutations/ModelPermission/UpdatePermissionMutation'
import tracker from '../../../utils/metrics'
import { ConsoleEvents, MutationType } from 'graphcool-metrics'
import DeleteModelPermissionMutation from '../../../mutations/DeleteModelPermissionMutation'
import {isValid, didChange} from './PermissionPopupState'
import {connect} from 'react-redux'
import * as Modal from 'react-modal'
import {fieldModalStyle} from '../../../utils/modalStyle'
import Loading from '../../../components/Loading/Loading'
import {extractSelection, addVarsAndName} from './ast'
import {showNotification} from '../../../actions/notification'
import {onFailureShowNotification} from '../../../utils/relay'
import {ShowNotificationCallback} from '../../../types/utils'

interface Props {
  params: any
  project: Project
  children: JSX.Element
  router: ReactRouter.InjectedRouter
  model?: Model
  permission?: ModelPermission
  isBetaCustomer: boolean
  showNotification: ShowNotificationCallback
}

export interface PermissionPopupState {
  selectedOperation: Operation
  fieldIds: string[]
  userType: UserType
  applyToWholeModel: boolean
  rule: PermissionRuleType
  ruleGraphQuery: string
  queryValid: boolean
  tabs: string[]
  showErrors: boolean
  selectedTabIndex: number
  editing: boolean
  loading: boolean
  queryChanged: boolean
}

const modalStyling = {
  ...fieldModalStyle,
  content: {
    ...fieldModalStyle.content,
    width: 750,
  },
}

class PermissionPopup extends React.Component<Props, PermissionPopupState> {
  private mutationType: MutationType

  constructor(props) {
    super(props)

    this.mutationType = props.permission ? 'Update' : 'Create'

    if (props.permission) {
      const {operation, fieldIds, userType, applyToWholeModel, rule, ruleGraphQuery} = props.permission
      this.state = {
        selectedOperation: operation,
        fieldIds,
        userType,
        applyToWholeModel,
        rule: rule,
        ruleGraphQuery: (!ruleGraphQuery || ruleGraphQuery === '') ?
          getEmptyPermissionQuery(props.model.namePlural) :
          addVarsAndName(props.model.namePlural, ruleGraphQuery, props.model.permissionQueryArguments),
        queryValid: true,
        tabs: ['Select affected Fields', 'Set Audience'],
        selectedTabIndex: 0,
        showErrors: false,
        editing: true,
        loading: false,
        queryChanged: false,
      }
      return
    }

    this.state = {
      selectedOperation: null,
      fieldIds: [],
      userType: 'EVERYONE' as UserType,
      applyToWholeModel: false,
      rule: 'NONE' as PermissionRuleType,
      ruleGraphQuery: getEmptyPermissionQuery(props.model.namePlural),
      queryValid: true,
      tabs: ['Set Permission Type', 'Select affected Fields', 'Set Audience'],
      selectedTabIndex: 0,
      showErrors: false,
      editing: false,
      loading: false,
      queryChanged: false,
    }
    global['p'] = this
  }

  componentDidMount() {
    tracker.track(ConsoleEvents.Permissions.Popup.opened({type: this.mutationType}))
  }

  render() {
    const {params, model} = this.props
    const {
      selectedOperation,
      fieldIds,
      userType,
      applyToWholeModel,
      rule,
      ruleGraphQuery,
      selectedTabIndex,
      showErrors,
      tabs,
      editing,
    } = this.state

    if (!model) {
      return null
    }

    const errors = isValid(this.state)
    const valid = !Object.keys(errors).reduce((acc, curr) => acc || errors[curr], false)
    const fields = model.fields.edges.map(edge => edge.node)
    const changed = didChange(this.state, this.props.permission)

    return (
      <Modal
        onRequestClose={(e) => {
          if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) {
            return
          }
          this.closePopup()
          tracker.track(ConsoleEvents.Permissions.Popup.canceled({type: this.mutationType}))
        }}
        isOpen={true}
        style={modalStyling}
        contentLabel='Permission Popup'
      >
        <style jsx>{`
          .permission-popup {
            @p: .flexColumn, .overflowVisible, .bgWhite, .relative;
          }
          .popup-body {
            max-height: calc(100vh - 200px);
          }
          .no-delete {
            @p: .pa38, .brown;
          }
          .loading {
            @p: .absolute, .top0, .bottom0, .flex, .itemsCenter, .justifyCenter, .bgWhite80, .z999;
            left: -20px;
            right: -20px;
            box-shadow: 0 0 10px rgba(255,255,255,.8);
          }
        `}</style>
          <div
            className='permission-popup'
          >
            <PermissionPopupHeader
              operation={this.state.selectedOperation}
              errors={errors}
              tabs={tabs}
              modelName={params.modelName}
              activeTabIndex={selectedTabIndex}
              onRequestClose={this.closePopup}
              onSelectTab={this.handleSelectTab}
              showErrors={showErrors}
              editing={editing}
            />
            <div className='popup-body'>
              {(editing ? false : selectedTabIndex === 0) && (
                <OperationChooser
                  selectedOperation={selectedOperation}
                  setOperation={this.setOperation}
                  errors={errors}
                  showErrors={showErrors}
                />
              )}
              {(editing ? selectedTabIndex === 0 : selectedTabIndex === 1) && (
                (selectedOperation !== null && ['CREATE', 'READ', 'UPDATE'].includes(selectedOperation)) ? (
                  <AffectedFields
                    selectedOperation={selectedOperation}
                    model={model}
                    fieldIds={fieldIds}
                    toggleField={this.toggleField}
                    toggleApplyToWholeModel={this.toggleApplyToWholeModel}
                    applyToWholeModel={applyToWholeModel}
                    onSelectAll={this.handleSelectAll}
                    onReset={this.handleReset}
                    errors={errors}
                    showErrors={showErrors}
                  />
                ) : (
                  <div className='no-delete'>
                    A delete Mutation doesn't affect any particular fields as the whole node gets deleted at once.
                  </div>
                )
              )}
              {(editing ? selectedTabIndex === 1 : selectedTabIndex === 2) && (
                <PermissionConditions
                  userType={userType}
                  isBetaCustomer={this.props.isBetaCustomer}
                  rule={rule}
                  fields={fields}
                  permissionSchema={model.permissionSchema}
                  permissionQueryArguments={model.permissionQueryArguments}
                  ruleGraphQuery={ruleGraphQuery}
                  setUserType={this.setUserType}
                  setRuleType={this.setRule}
                  setRuleGraphQuery={this.setRuleGraphQuery}
                  operation={selectedOperation}
                  errors={errors}
                  showErrors={showErrors}
                  onQueryValidityChange={this.handleQueryValidityChange}
                />
              )}
            </div>
            <PermissionPopupFooter
              valid={valid}
              onCancel={this.closePopup}
              onDelete={this.deletePermission}
              onSubmit={this.handleSubmit}
              create={!editing}
              onSelectIndex={this.handleSelectTab}
              activeTabIndex={this.state.selectedTabIndex}
              changed={changed}
              tabs={tabs}
            />
            {this.state.loading && (
              <div className='loading'>
                <Loading />
              </div>
            )}
          </div>
      </Modal>
    )
  }

  private handleQueryValidityChange = (valid: boolean) => {
    this.setState({queryValid: valid} as PermissionPopupState)
  }

  private handleSubmit = () => {
    const errors = isValid(this.state)
    const valid = !Object.keys(errors).reduce((acc, curr) => acc || errors[curr], false)

    if (!valid) {
      return this.setState({
        showErrors: true,
      } as PermissionPopupState)
    }

    if (this.state.editing) {
      this.updatePermission()
    } else {
      this.createPermission()
    }
  }

  private handleSelectAll = () => {
    const fieldIds = this.props.model.fields.edges.map(edge => edge.node.id)
    this.setState({
      applyToWholeModel: false,
      fieldIds,
    } as PermissionPopupState)
  }

  private handleReset = () => {
    this.setState({
      applyToWholeModel: false,
      fieldIds: [],
    } as PermissionPopupState)
  }

  private handleSelectTab = (index: number) => {
    this.setState({selectedTabIndex: index} as PermissionPopupState)
  }

  private setOperation = (operation: Operation) => {
    this.setState({selectedOperation: operation} as PermissionPopupState)
  }

  private setRule = (rule: PermissionRuleType) => {
    this.setState({rule} as PermissionPopupState)
  }

  private setRuleGraphQuery = (ruleGraphQuery: string) => {
    this.setState({ruleGraphQuery, queryChanged: true} as PermissionPopupState)
  }

  private toggleField = (id: string) => {
    if (!this.state.fieldIds.includes(id)) {
      const fieldIds = this.state.fieldIds.concat(id)
      this.setState({fieldIds} as PermissionPopupState)
    } else {
      const i = this.state.fieldIds.indexOf(id)

      const fieldIds = this.state.fieldIds.slice()
      fieldIds.splice(i, 1)

      this.setState({fieldIds} as PermissionPopupState)
    }
  }

  private setUserType = (userType: UserType) => {
    this.setState({userType} as PermissionPopupState)
  }

  private toggleApplyToWholeModel = () => {
    const {applyToWholeModel} = this.state
    this.setState({applyToWholeModel: !applyToWholeModel} as PermissionPopupState)
  }

  private updatePermission = () => {
    const {permission: {isActive, id}} = this.props
    const {selectedOperation, fieldIds, userType, applyToWholeModel, rule, ruleGraphQuery} = this.state

    const updatedNode = {
      id,
      operation: selectedOperation,
      fieldIds,
      userType,
      applyToWholeModel,
      rule: rule,
      ruleGraphQuery: extractSelection(ruleGraphQuery),
      isActive,
    }
    tracker.track(ConsoleEvents.Permissions.Popup.submitted({type: this.mutationType}))

    this.setState({loading: true} as PermissionPopupState, () => {
      Relay.Store.commitUpdate(
        new UpdatePermissionMutation(updatedNode),
        {
          onSuccess: () => this.closePopup(),
          onFailure: (transaction) => {
            onFailureShowNotification(transaction, this.props.showNotification)
            this.setState({loading: false} as PermissionPopupState)
          },
        },
      )
    })
  }

  private createPermission = () => {
    const {model} = this.props
    const {selectedOperation, fieldIds, userType, applyToWholeModel} = this.state

    tracker.track(ConsoleEvents.Permissions.Popup.submitted({type: this.mutationType}))
    this.setState({loading: true} as PermissionPopupState, () => {
      Relay.Store.commitUpdate(
        new AddPermissionMutation({
          modelId: model.id,
          operation: selectedOperation,
          fieldIds,
          userType,
          applyToWholeModel,
        }),
        {
          onSuccess: () => this.closePopup(),
          onFailure: (transaction) => {
            onFailureShowNotification(transaction, this.props.showNotification)
            this.setState({loading: false} as PermissionPopupState)
          },
        },
      )
    })
  }

  private deletePermission = () => {
    const {permission: {id}, model} = this.props

    tracker.track(ConsoleEvents.Permissions.Popup.submitted({type: this.mutationType}))
    this.setState({loading: true} as PermissionPopupState, () => {
      Relay.Store.commitUpdate(
        new DeleteModelPermissionMutation({
          modelPermissionId: id,
          modelId: model.id,
        }),
        {
          onSuccess: () => this.closePopup(),
          onFailure: (transaction) => {
            onFailureShowNotification(transaction, this.props.showNotification)
            this.setState({loading: false} as PermissionPopupState)
          },
        },
      )
    })
  }

  private closePopup = () => {
    const {router, params} = this.props
    router.push(`/${params.projectName}/permissions`)
  }
}

const ReduxContainer = connect(null, {showNotification})(PermissionPopup)

const MappedPermissionPopup = mapProps({
  permission: props => props.node || null,
  model: props => (props.viewer && props.viewer.model) || (props.node && props.node.model),
  isBetaCustomer: props => (props.viewer && props.viewer.user.crm.information.isBeta) || false,
})(ReduxContainer)

export const EditPermissionPopup = Relay.createContainer(withRouter(MappedPermissionPopup), {
  fragments: {
    node: () => Relay.QL`
      fragment on Node {
        id
        ... on ModelPermission {
          applyToWholeModel
          fieldIds
          operation
          isActive
          rule
          ruleGraphQuery
          userType
          model {
            namePlural
            permissionSchema(operation: READ)
            permissionQueryArguments(operation: READ) {
              group
              name
              typeName
            }
            fields(first: 100) {
              edges {
                node {
                  id
                  name
                  isList
                  typeIdentifier
                }
              }
            }
            ${AffectedFields.getFragment('model')}
          }
        }
      }
    `,
    viewer: () => Relay.QL`
      fragment on Viewer {
        user {
          crm {
            information {
              isBeta
            }
          }
        }
      }
    `,
  },
})

export const AddPermissionPopup = Relay.createContainer(withRouter(MappedPermissionPopup), {
  initialVariables: {
    projectName: null, // injected from router
    modelName: null, // injected from router
  },
  fragments: {
    viewer: () => Relay.QL`
      fragment on Viewer {
        user {
          crm {
            information {
              isBeta
            }
          }
        }
        model: modelByName(projectName: $projectName, modelName: $modelName) {
          id
          name
          namePlural
          permissionSchema(operation: READ)
          permissionQueryArguments(operation: READ) {
            group
            name
            typeName
          }
          fields(first: 100) {
            edges {
              node {
                id
                name
                isList
                typeIdentifier
              }
            }
          }
          ${AffectedFields.getFragment('model')}
        }
      }
    `,
  },
})

function getEmptyPermissionQuery(modelNamePlural: string) {
  return `# This is a permission query.
# If the query you define returns a node, the permission is valid.
# To have as powerful queries as possible, we provide you a lot of
# variables. The first variable that is already preselected for you 
# is the $nodeId. Each permission is executed per each single node.
# For the mutations it's the node that will be mutated,
# for the select case it's the node that is being requested.
# You can explore more variables on the right hand side.

query permit${modelNamePlural}($nodeId: ID) {
  all${modelNamePlural}(
    filter: {
      id: $nodeId
    }
  ) {
    id
  }
}`
}
