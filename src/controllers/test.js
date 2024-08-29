const forYou = async (req, res) => {
    try {
      // Step 1: Get all history records of the user sorted by most recent
      const userHistory = await History.find({
        user: req.user._id,
        series: { $exists: true },
      })
        .populate("series")
        .sort({ createdAt: -1 });
  
      if (!userHistory.length) {
        return res.status(404).json({
          status: "404",
          message: "No series found in the user's history",
        });
      }
  
      // Step 2: Determine the unique categories from the user's history
      const uniqueCategories = new Set();
      const seriesByCategory = {};
      userHistory.forEach((record) => {
        if (record.series && record.series.category) {
          const categoryId = String(record.series.category);
          uniqueCategories.add(categoryId);
  
          if (!seriesByCategory[categoryId]) {
            seriesByCategory[categoryId] = [];
          }
          seriesByCategory[categoryId].push(record.series._id);
        }
      });
  
      const uniqueCategoriesArray = Array.from(uniqueCategories);
      // Limit to at most 3 categories
      if (uniqueCategoriesArray.length > 3) {
        uniqueCategoriesArray.splice(3); // Keep only the 3 most recent categories
      }
  
      // Step 3: Determine the Level based on the number of unique categories
      let response = [];
      if (uniqueCategoriesArray.length === 1) {
        // Level 1: Single category
        const [categoryId] = uniqueCategoriesArray;
  
        // Step 4: Find all series with the same category
        const allSeriesInCategory = await Series.find({ category: categoryId }).select('_id');
        const allSeriesIds = allSeriesInCategory.map((series) => series._id);
  
        // Step 5: Get episodes for all series in that category
        response = await getEpisodesBySeriesOrder(allSeriesIds);
  
      } else if (uniqueCategoriesArray.length === 2) {
        // Level 2: Two unique categories
        const [latestCategory, olderCategory] = uniqueCategoriesArray;
  
        const latestSeries = await Series.find({ category: latestCategory }).select('_id');
        const olderSeries = await Series.find({ category: olderCategory }).select('_id');
  
        const latestEpisodes = await getEpisodesBySeriesOrder(
          latestSeries.map((series) => series._id)
        );
        const olderEpisodes = await getEpisodesBySeriesOrder(
          olderSeries.map((series) => series._id)
        );
        response = [...latestEpisodes, ...olderEpisodes];
  
      } else if (uniqueCategoriesArray.length === 3) {
        // Level 3: Three unique categories (or more)
        const [latestCategory, middleCategory, oldestCategory] =
          uniqueCategoriesArray;
  
        const latestSeries = await Series.find({ category: latestCategory }).select('_id');
        const middleSeries = await Series.find({ category: middleCategory }).select('_id');
        const oldestSeries = await Series.find({ category: oldestCategory }).select('_id');
  
        const latestEpisodes = await getEpisodesBySeriesOrder(
          latestSeries.map((series) => series._id)
        );
        const middleEpisodes = await getEpisodesBySeriesOrder(
          middleSeries.map((series) => series._id)
        );
        const oldestEpisodes = await getEpisodesBySeriesOrder(
          oldestSeries.map((series) => series._id)
        );
        response = [...latestEpisodes, ...middleEpisodes, ...oldestEpisodes];
      }
  
      return success(res, "200", "Success", response);
    } catch (err) {
      error500(res, err);
    }
  };
  
  // Helper function to get episodes in order for a series array
  async function getEpisodesBySeriesOrder(seriesIds) {
    // Fetch all episodes for the given series IDs, sorted by creation date
    const episodes = await Episode.find({ series: { $in: seriesIds } })
      .populate({
        path: "series",
        populate: { path: "category" },
      })
      .sort({ createdAt: 1 }); // Sort by creation date to get episodes in order
  
    // Group episodes by series ID and limit to the first 3 episodes
    const episodesBySeries = {};
    seriesIds.forEach((id) => {
      episodesBySeries[id] = episodes
        .filter((ep) => String(ep.series._id) === String(id))
        .slice(0, 3); // Only keep the first 3 episodes
    });
  
    const orderedEpisodes = [];
  
    // Interleave episodes: 1st of each series, then 2nd of each series, then 3rd of each series
    for (let i = 0; i < 3; i++) {
      seriesIds.forEach((seriesId) => {
        const episode = episodesBySeries[seriesId][i] || {}; // Get the i-th episode or empty object
        if (Object.keys(episode).length > 0) {
          // Add the episode to the ordered list
          orderedEpisodes.push({
            episodeVideo: episode.episodeVideo || {},
            _id: episode._id || null,
            series: {
              thumbnail: episode.series?.thumbnail || {},
              _id: episode.series?._id || null,
              title: episode.series?.title || "",
              description: episode.series?.description || "",
              category: {
                _id: episode.series?.category?._id || null,
                title: episode.series?.category?.title || "",
              },
              visibility: episode.series?.visibility || "",
            },
            title: episode.title || "",
            description: episode.description || "",
            coins: episode.coins || 0,
            content: episode.content || "",
            totalViews: episode.totalViews || 0,
            episodeRating: episode.episodeRating || 0,
            ratings: episode.ratings || [],
            createdAt: episode.createdAt || "",
          });
        } 
      });
    }
  
    return orderedEpisodes;
  }