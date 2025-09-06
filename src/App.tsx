import GoalDefinition from './components/GoalDefinition';
import Header from './components/Header';
import Roster from './components/Roster';
import TopBreedingPair from './components/TopBreedingPair';

function App() {
  return (
    <div className="page">
      <div className="container mx-auto p-4 md:p-8 max-w-7xl">
        <Header />

        <nav className="tabs__container">
            <ul id="tabs-list" className="tabs__list">
                {/* Placeholder for tabs */}
                <li className="tab tab--active">
                    <button className="tab__button">My First Project</button>
                </li>
            </ul>
            <button id="add-profile-btn" className="tabs__add-btn" title="Add New Project">
                <svg xmlns="http://www.w.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
            </button>
        </nav>

        <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg-col-span-1 space-y-8">
                <GoalDefinition />
                <TopBreedingPair />
            </div>
            <Roster />
        </main>
      </div>
    </div>
  )
}

export default App