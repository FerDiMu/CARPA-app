import { ReactNode } from 'react'

interface CalibrationNavBarProps {
  onclick_restart: () => void
  onclick_kalman: () => void
  onclick_help: () => void
  accuracy_id: string
  children: ReactNode
}

export const CalibrationNavBar = ({
  onclick_restart,
  onclick_kalman,
  onclick_help,
  accuracy_id,
  children,
}: CalibrationNavBarProps) => {
  return (
    <>
      <nav
        id="webgazerNavbar"
        className="navbar navbar-expand-lg navbar-default navbar-fixed-top"
      >
        <div className="container-fluid">
          <div className="navbar-header">
            <button
              type="button"
              className="navbar-toggler"
              data-toggle="collapse"
              data-target="#myNavbar"
            >
              <span className="navbar-toggler-icon">Menu</span>
            </button>
          </div>
          <div className="collapse navbar-collapse" id="myNavbar">
            <ul className="nav navbar-nav">
              <li id={accuracy_id}>{children}</li>
              <li>
                <a onClick={onclick_restart} href="#">
                  Recalibrate
                </a>
              </li>
              <li>
                <a onClick={onclick_kalman} href="#">
                  Toggle Kalman Filter
                </a>
              </li>
            </ul>
            <ul className="nav navbar-nav navbar-right">
              <li>
                <a className="helpBtn" onClick={onclick_help} href="#">
                  <span className="glyphicon glyphicon-cog"></span> Help
                </a>
              </li>
            </ul>
          </div>
        </div>
      </nav>
    </>
  )
}
