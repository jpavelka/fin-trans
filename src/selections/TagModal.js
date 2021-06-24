import React, { useState } from "react";
import { Modal } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";

const TagModal = ({show, setShow, selectionValues, setSelectionValues, allTags}) => {
    const originalStatuses = {}
    for (const tag of allTags){
        originalStatuses[tag] = selectionValues.requiredTags.includes(tag) ? 'must' : (
            selectionValues.forbiddenTags.includes(tag) ? 'cannot' : 'can'
        )
    }
    const [statuses, setStatuses] = useState(originalStatuses)
    const handleClose = (statusesToSet) => {
        setSelectionValues(v => {
            let newObj = {
                requiredTags: Object.keys(statusesToSet).filter(t => statusesToSet[t] === 'must'),
                forbiddenTags: Object.keys(statusesToSet).filter(t => statusesToSet[t] === 'cannot')
            }
            return {...v, ...newObj}
        })
        setShow(false)
    }
    return (
        <div>
      <Modal show={show}>
        <Modal.Header>
          <h3>Tag Detail</h3>
        </Modal.Header>
        <Modal.Body>
            <table>
                <thead>
                    <tr>
                    <td></td>
                    {['Can Have', 'Must Have', "Can't Have"].map(s => {
                        return <td style={{textAlign: 'center', padding: '5pt'}}>{s}</td>
                    })}
                    </tr>
                </thead>
                <tbody>
                    {allTags.map(tag => {
                        return(
                            <tr>
                                <td>{tag}</td>
                                {['can', 'must', 'cannot'].map(v => {
                                    const checked = (statuses[tag] || 'can') === v
                                    return(<td style={{textAlign: 'center'}}>
                                        <input type='radio' name={tag} value={v} defaultChecked={checked} onChange={(e) => {
                                            setStatuses(s => {
                                                let newObj = {}
                                                newObj[e.target.name] = e.target.value;
                                                return {...s, ...newObj}
                                            })
                                        }}/>
                                    </td>)
                                })}
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </Modal.Body>
        <Modal.Footer>
          <button
            onClick={() => handleClose(statuses)}
          >
            Save
          </button>
          <button onClick={() => handleClose(originalStatuses)}>Cancel</button>
        </Modal.Footer>
      </Modal>
    </div>
    )
}

export default TagModal
