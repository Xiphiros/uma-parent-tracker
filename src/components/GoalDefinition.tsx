const GoalDefinition = () => {
    return (
        <section id="goal-definition" className="card">
            <h2 className="card__title">
                <svg xmlns="http://www.w.org/2000/svg" className="h-6 w-6 mr-2 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6H8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" /></svg>
                Define Goal Parent
            </h2>
            <div className="space-y-4">
                <p className="card__placeholder-text">Goal definition controls will go here.</p>
            </div>
        </section>
    );
};

export default GoalDefinition;