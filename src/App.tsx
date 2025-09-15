import GoalDefinition from './components/GoalDefinition';
import Header from './components/Header';
import Roster from './components/Roster';
import TopBreedingPair from './components/TopBreedingPair';
import Tabs from './components/Tabs';
import { useAppContext } from './context/AppContext';
import BreedingSuggestions from './components/BreedingSuggestions';

function App() {
  const { loading, getActiveProfile } = useAppContext();
  
  if (loading) {
    return (
      <div className="page">
        <div className="container mx-auto p-4 md:p-8 max-w-7xl text-center">
          <p>Loading data...</p>
        </div>
      </div>
    );
  }
  
  if (!getActiveProfile()) {
    return (
       <div className="page">
        <div className="container mx-auto p-4 md:p-8 max-w-7xl text-center">
          <Header />
          <p className="mt-8">No active profile found. Please add a new project to begin.</p>
           <Tabs />
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="container mx-auto p-4 md:p-8 max-w-7xl">
        <Header />
        <Tabs />
        <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg-col-span-1 space-y-8">
                <GoalDefinition />
                <TopBreedingPair />
                <BreedingSuggestions />
            </div>
            <Roster />
        </main>
      </div>
    </div>
  )
}

export default App